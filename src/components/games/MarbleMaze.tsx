import { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RefreshCw, Volume2, VolumeX, Sparkles, AlertCircle, Compass, Play, Share2, Check } from 'lucide-react';
import type { Locale } from '../../lib/i18n';
import { getBest, recordBest } from '../../lib/games/records';
import { hasWebGL } from '../../lib/games/webgl';
import { generateMaze, type MazeConfig } from '../../lib/games/marble-maze';
import { celebrate } from '../../lib/games/celebration';
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from '../../lib/games/share-card';

const MarbleMazeScene = lazy(() => import('./MarbleMazeScene'));

const GAME_KEY = 'marble-maze-3d';

interface Copy {
  title: string;
  subtitle: string;
  start: string;
  retry: string;
  cleared: string;
  fallen: string;
  time: string;
  score: string;
  best: string;
  gems: string;
  level: string;
  easy: string;
  normal: string;
  hard: string;
  unavailable: string;
  controlsHint: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: 'Marble Maze 3D',
    subtitle: '입체 3D 미로 판을 기울여 구슬을 굴리고, 붉은 함정을 피해 보석을 획득하며 탈출하세요!',
    start: '게임 시작',
    retry: '다시 도전',
    cleared: '🎉 미로 탈출 성공!',
    fallen: '💥 함정에 빠졌습니다!',
    time: '시간',
    score: '점수',
    best: '최고 점수',
    gems: '보석',
    level: '크기',
    easy: '9×9 초급',
    normal: '11×11 표준',
    hard: '15×15 마스터',
    unavailable: '이 브라우저에서는 WebGL 3D 그래픽을 사용할 수 없습니다.',
    controlsHint: '방향키 / WASD / 화면 드래그로 3D 보드를 기울여 공을 굴리세요.',
  },
  en: {
    title: 'Marble Maze 3D',
    subtitle: 'Tilt the 3D board to roll your marble, collect glittering gems, avoid deadly pit traps, and reach the goal!',
    start: 'Start Game',
    retry: 'Try Again',
    cleared: '🎉 Maze Escaped!',
    fallen: '💥 Fallen into Trap!',
    time: 'Time',
    score: 'Score',
    best: 'Best Score',
    gems: 'Gems',
    level: 'Size',
    easy: '9×9 Easy',
    normal: '11×11 Normal',
    hard: '15×15 Master',
    unavailable: 'WebGL 3D graphics is not available in this browser.',
    controlsHint: 'Use Arrow keys, WASD, or drag on screen to tilt the 3D maze board.',
  },
  ja: {
    title: 'Marble Maze 3D',
    subtitle: '3D迷路盤を傾けてボールを転がし、赤い罠を避けて宝石を集めながらゴールを目指そう！',
    start: 'ゲーム開始',
    retry: 'もう一度挑戦',
    cleared: '🎉 脱出成功！',
    fallen: '💥 罠に落ちました！',
    time: 'タイム',
    score: 'スコア',
    best: '最高スコア',
    gems: '宝石',
    level: 'サイズ',
    easy: '9×9 初級',
    normal: '11×11 標準',
    hard: '15×15 上級',
    unavailable: 'お使いのブラウザではWebGL 3Dをご利用いただけません。',
    controlsHint: '矢印キー / WASD / 画面ドラッグで盤面を傾けて転がします。',
  },
  zh: {
    title: 'Marble Maze 3D',
    subtitle: '倾斜3D迷宫盘面滚动弹珠，避开致命陷阱并收集宝石，冲向终点！',
    start: '开始游戏',
    retry: '再次尝试',
    cleared: '🎉 成功逃脱迷宫！',
    fallen: '💥 掉入陷阱！',
    time: '用时',
    score: '得分',
    best: '最高分',
    gems: '宝石',
    level: '尺寸',
    easy: '9×9 初级',
    normal: '11×11 标准',
    hard: '15×15 专家',
    unavailable: '当前浏览器不支持WebGL 3D图形。',
    controlsHint: '使用方向键、WASD或屏幕拖动倾斜3D盘面。',
  },
  fr: {
    title: 'Marble Maze 3D',
    subtitle: 'Inclinez le plateau 3D pour faire rouler la bille, ramassez les gemmes et fuyez les pièges !',
    start: 'Jouer',
    retry: 'Réessayer',
    cleared: '🎉 Labyrinthe terminé !',
    fallen: '💥 Tombé dans un piège !',
    time: 'Temps',
    score: 'Score',
    best: 'Meilleur score',
    gems: 'Gemmes',
    level: 'Taille',
    easy: '9×9 Facile',
    normal: '11×11 Normal',
    hard: '15×15 Expert',
    unavailable: 'WebGL 3D n’est pas disponible sur ce navigateur.',
    controlsHint: 'Utilisez les touches fléchées / ZQSD ou glissez pour incliner le plateau.',
  },
  es: {
    title: 'Marble Maze 3D',
    subtitle: '¡Inclina el tablero 3D para rodar la canica, esquiva las trampas y recoge las gemas hasta la meta!',
    start: 'Iniciar',
    retry: 'Intentar de nuevo',
    cleared: '🎉 ¡Laberinto completado!',
    fallen: '💥 ¡Caíste en la trampa!',
    time: 'Tiempo',
    score: 'Puntuación',
    best: 'Récord',
    gems: 'Gemas',
    level: 'Tamaño',
    easy: '9×9 Fácil',
    normal: '11×11 Normal',
    hard: '15×15 Experto',
    unavailable: 'WebGL 3D no está disponible en este navegador.',
    controlsHint: 'Usa las flechas, WASD o arrastra la pantalla para inclinar el tablero.',
  },
};

export default function MarbleMaze({ locale = 'ko' }: { locale?: Locale }) {
  const t = COPY[locale] ?? COPY.ko;
  const [size, setSize] = useState<number>(11);
  const [config, setConfig] = useState<MazeConfig>(() => generateMaze(11, 11, Date.now()));
  const [status, setStatus] = useState<'idle' | 'playing' | 'cleared' | 'fallen'>('idle');
  const [collectedGems, setCollectedGems] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [webglSupported, setWebglSupported] = useState(true);
  const [shareCardCopied, setShareCardCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setWebglSupported(hasWebGL());
    const saved = getBest(GAME_KEY);
    if (saved) setBestScore(saved.value);
  }, []);

  const handleShareCard = useCallback(async () => {
    const canvas = createShareCardCanvas({
      title: "Marble Maze 3D",
      subtitle: `${size}×${size} Tilt Maze Escaped`,
      score: `${finalScore} PTS`,
      slug: "marble-maze",
      customStats: [
        { label: "Maze Size", value: `${size}×${size}` },
        { label: "Escape Time", value: `${elapsedTime}s` },
        { label: "Gems Collected", value: `${collectedGems}/${config.gemTotal}` },
        { label: "High Score", value: `${bestScore}` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `marble-maze-${finalScore}pts.png`);
    }
  }, [size, finalScore, elapsedTime, collectedGems, config.gemTotal, bestScore]);

  const startNewGame = (newSize = size) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const newConfig = generateMaze(newSize, newSize, Date.now());
    setConfig(newConfig);
    setCollectedGems(0);
    setElapsedTime(0);
    setFinalScore(0);
    setStatus('playing');

    const startAt = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startAt) / 1000));
    }, 1000);
  };

  const handleClear = (finalSeconds: number, score: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsedTime(Math.floor(finalSeconds));
    setFinalScore(score);
    setStatus('cleared');
    if (containerRef.current) celebrate(containerRef.current, { preset: "coins" });
    if (score > bestScore) {
      setBestScore(score);
      recordBest(GAME_KEY, score, 'score');
    }
  };

  const handleFall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('fallen');
  };

  const handleGemCollected = (count: number) => {
    setCollectedGems(count);
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
    <div ref={containerRef} className="mx-auto max-w-4xl space-y-6">
      {/* Header Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Compass className="h-7 w-7 text-primary" />
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

      {/* Control Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-3">
        {/* Level size selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{t.level}:</span>
          {[
            { val: 9, label: t.easy },
            { val: 11, label: t.normal },
            { val: 15, label: t.hard },
          ].map(({ val, label }) => (
            <button
              key={val}
              disabled={status === 'playing'}
              onClick={() => {
                setSize(val);
                startNewGame(val);
              }}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                size === val
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent disabled:opacity-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Real-time Stats */}
        <div className="flex items-center gap-6 font-mono text-sm">
          <div className="flex items-center gap-1.5 text-info">
            <Sparkles className="h-4 w-4" />
            <span>{t.gems}: {collectedGems} / {config.gemTotal}</span>
          </div>
          <div className="text-muted-foreground">
            {t.time}: <span className="font-bold text-foreground">{elapsedTime}s</span>
          </div>
        </div>
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
            <MarbleMazeScene
              config={config}
              status={status === 'playing' ? 'playing' : status === 'cleared' ? 'cleared' : 'fallen'}
              onCollectGem={handleGemCollected}
              onClear={handleClear}
              onFall={handleFall}
              audioEnabled={audioEnabled}
            />
          ) : (
            <div className="relative flex h-135 w-full flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center">
              <div className="relative mb-6">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-border bg-secondary">
                  <Compass className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">{t.title}</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">{t.controlsHint}</p>
              <button
                onClick={() => startNewGame()}
                className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95"
              >
                <Play className="h-5 w-5 fill-current" />
                {t.start}
              </button>
            </div>
          )}
        </Suspense>

        {/* Modal Overlay on Clear or Fallen */}
        {(status === 'cleared' || status === 'fallen') && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl p-6">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">
                {status === 'cleared' ? t.cleared : t.fallen}
              </h3>
              {status === 'cleared' && (
                <div className="my-4 space-y-1.5 font-mono text-sm">
                  <div className="text-muted-foreground">
                    {t.time}: <span className="text-foreground font-bold">{elapsedTime}s</span>
                  </div>
                  <div className="text-muted-foreground">
                    {t.gems}: <span className="text-info font-bold">{collectedGems} / {config.gemTotal}</span>
                  </div>
                  <div className="text-warning text-lg font-bold mt-2">
                    {t.score}: {finalScore}
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => startNewGame()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t.retry}
                </button>
                {status === 'cleared' && (
                  <button
                    type="button"
                    onClick={handleShareCard}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/20 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/30"
                    title={shareCardCopied ? "복사됨!" : "결과 카드 공유"}
                  >
                    {shareCardCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    <span>{shareCardCopied ? "복사 완료" : "결과 카드 공유"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
