import { useCallback, useEffect, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { Share2, Check, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import {
  generateSeededMaze,
  MAZE_SIZES,
  moveMaze,
  parseMaze,
  serializeMaze,
  type MazeDifficulty,
} from "../../lib/games/maze";
import { MAZE_SPRITES, getSpriteUrl } from "../../lib/games/sprites";
import { createTonePlayer, type TonePlayer } from "../../lib/games/tone";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";

function TiltMazeButton({
  children,
  onClick,
  className = '',
  disabled = false,
  title,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel || title}
      onClick={() => {
        triggerPop(0.12);
        onClick?.();
      }}
      disabled={disabled}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`touch-manipulation select-none transition-all duration-150 transform-(--card-tilt) will-change-transform ${className}`}
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
    >
      {children}
    </button>
  );
}
const SAVE = "oiyo:maze:v1",
  BEST = "oiyo-maze-best";
const C = {
  ko: {
    title: "미로 찾기",
    sub: "살아 있는 정원",
    start: "탐험 시작",
    easy: "쉬움",
    medium: "보통",
    hard: "어려움",
    time: "시간",
    best: "최단",
    pause: "일시정지",
    resume: "계속하기",
    sound: "소리",
    win: "출구의 불빛에 도착했어요",
    again: "새 미로",
    hint: "방향키·화면 버튼·스와이프로 출구까지 이동하세요.",
    restored: "저장된 탐험을 이어서 불러왔어요",
    up: "위",
    down: "아래",
    left: "왼쪽",
    right: "오른쪽",
  },
  en: {
    title: "Maze Escape",
    sub: "The Living Garden",
    start: "Begin exploring",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    time: "Time",
    best: "Best",
    pause: "Pause",
    resume: "Resume",
    sound: "Sound",
    win: "You reached the beacon",
    again: "New maze",
    hint: "Use arrows, screen controls or swipe to reach the exit.",
    restored: "Your saved exploration was restored",
    up: "Up",
    down: "Down",
    left: "Left",
    right: "Right",
  },
  ja: {
    title: "迷路脱出",
    sub: "生きている庭",
    start: "探索開始",
    easy: "かんたん",
    medium: "ふつう",
    hard: "むずかしい",
    time: "時間",
    best: "最短",
    pause: "一時停止",
    resume: "続ける",
    sound: "サウンド",
    win: "出口の光に到着しました",
    again: "新しい迷路",
    hint: "矢印・画面ボタン・スワイプで出口を目指します。",
    restored: "保存した探索を復元しました",
    up: "上",
    down: "下",
    left: "左",
    right: "右",
  },
  zh: {
    title: "走出迷宫",
    sub: "鲜活花园",
    start: "开始探索",
    easy: "简单",
    medium: "普通",
    hard: "困难",
    time: "时间",
    best: "最快",
    pause: "暂停",
    resume: "继续",
    sound: "声音",
    win: "你到达了出口灯塔",
    again: "新迷宫",
    hint: "使用方向键、屏幕按钮或滑动到达出口。",
    restored: "已恢复保存的探索",
    up: "上",
    down: "下",
    left: "左",
    right: "右",
  },
  fr: {
    title: "Évasion du labyrinthe",
    sub: "Le jardin vivant",
    start: "Explorer",
    easy: "Facile",
    medium: "Moyen",
    hard: "Difficile",
    time: "Temps",
    best: "Record",
    pause: "Pause",
    resume: "Reprendre",
    sound: "Son",
    win: "Vous avez atteint la lumière",
    again: "Nouveau labyrinthe",
    hint: "Utilisez les flèches, boutons ou glissements pour sortir.",
    restored: "Votre exploration a été restaurée",
    up: "Haut",
    down: "Bas",
    left: "Gauche",
    right: "Droite",
  },
  es: {
    title: "Escape del laberinto",
    sub: "El jardín vivo",
    start: "Explorar",
    easy: "Fácil",
    medium: "Normal",
    hard: "Difícil",
    time: "Tiempo",
    best: "Récord",
    pause: "Pausa",
    resume: "Continuar",
    sound: "Sonido",
    win: "Llegaste a la luz de salida",
    again: "Nuevo laberinto",
    hint: "Usa flechas, botones o desliza para llegar a la salida.",
    restored: "Se restauró tu exploración",
    up: "Arriba",
    down: "Abajo",
    left: "Izquierda",
    right: "Derecha",
  },
} as const;
export default function MazeGame({ locale = "ko" }: { locale?: string }) {
  const t = C[locale as keyof typeof C] ?? C.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: (locale as any) || "ko" });
  const [difficulty, setDifficulty] = useState<MazeDifficulty>("easy"),
    [seed, setSeed] = useState(1),
    [maze, setMaze] = useState(() => generateSeededMaze(11, 1)),
    [pos, setPos] = useState<[number, number]>([0, 0]),
    [seconds, setSeconds] = useState(0),
    [phase, setPhase] = useState<"briefing" | "playing" | "paused" | "won">(
      "briefing",
    ),
    [best, setBest] = useState<Record<string, number>>({}),
    [sound, setSound] = useState(true),
    [restored, setRestored] = useState(false),
    [shareCardCopied, setShareCardCopied] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const player = useRef<TonePlayer | null>(null);

  const handleShareCard = useCallback(async () => {
    const canvas = createShareCardCanvas({
      title: "Maze Escape",
      subtitle: "The Living Garden",
      score: `${seconds}초 탈출`,
      slug: "maze",
      customStats: [
        { label: "DIFFICULTY", value: difficulty.toUpperCase() },
        { label: "BEST", value: best[difficulty] !== undefined ? `${best[difficulty]}s` : "—" },
        { label: "GRID", value: `${maze.length}x${maze.length}` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `maze-escape-${seconds}s.png`);
    }
  }, [seconds, difficulty, best, maze.length]);
  const tone = useCallback(
    (f: number) => {
      if (!sound) return;
      player.current ??= createTonePlayer();
      player.current.play(f, 0.1, 0.025);
    },
    [sound],
  );
  useEffect(() => () => player.current?.close(), []);
  useEffect(() => {
    try {
      setBest(JSON.parse(localStorage.getItem(BEST) || "{}"));
    } catch {}
    const s = parseMaze(localStorage.getItem(SAVE));
    if (s) {
      setSeed(s.seed);
      setDifficulty(s.difficulty);
      setMaze(s.maze);
      setPos(s.pos);
      setSeconds(s.seconds);
      setRestored(true);
      setPhase("paused");
    }
  }, []);
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase === "playing")
      localStorage.setItem(SAVE, serializeMaze(seed, difficulty, pos, seconds));
  }, [phase, seed, difficulty, pos, seconds]);
  const start = (d: MazeDifficulty = difficulty) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    setDifficulty(d);
    setSeed(a[0]);
    setMaze(generateSeededMaze(MAZE_SIZES[d], a[0]));
    setPos([0, 0]);
    setSeconds(0);
    setRestored(false);
    setPhase("playing");
  };
  const go = useCallback(
    (dr: number, dc: number) => {
      if (phase !== "playing") return;
      const next = moveMaze(maze, pos, dr, dc);
      if (next === pos) {
        MobileHapticsPro.warningPattern();
        tone(140);
        return;
      }
      MobileHapticsPro.lightImpact();
      setPos(next);
      tone(360);
      if (next[0] === maze.length - 1 && next[1] === maze.length - 1) {
        setPhase("won");
        localStorage.removeItem(SAVE);
        MobileHapticsPro.successPattern();
        tone(760);
        if (containerRef.current) {
          celebrate(containerRef.current, { preset: "leaves" });
        }
        setBest((b) => {
          const old = b[difficulty],
            n = {
              ...b,
              [difficulty]:
                old === undefined ? seconds : Math.min(old, seconds),
            };
          localStorage.setItem(BEST, JSON.stringify(n));
          return n;
        });
      }
    },
    [phase, maze, pos, tone, difficulty, seconds],
  );
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        togglePortal();
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setSound((v) => !v);
        return;
      }
      const map: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
        KeyW: [-1, 0],
        KeyS: [1, 0],
        KeyA: [0, -1],
        KeyD: [0, 1],
      };
      if (map[e.code || e.key] && phase === "playing") {
        e.preventDefault();
        go(...map[e.code || e.key]);
      }
      if (e.key.toLowerCase() === "p") {
        setPhase((p) =>
          p === "playing" ? "paused" : p === "paused" ? "playing" : p,
        );
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go, phase, togglePortal]);
  if (phase === "briefing")
    return (
      <div ref={containerRef} className={`w-full ${isImmersive ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-4 overflow-y-auto' : ''}`}>
        <GameContainer title={t.title} subtitle={t.sub} onReset={() => start()}>
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <img
              src="/games/maze-social.png"
              alt=""
              className="h-64 w-full object-cover sm:h-80"
            />
            <div className="p-5 text-center flex flex-col items-center">
              <p className="text-sm text-muted-foreground">{t.hint}</p>
              <TiltMazeButton
                onClick={() => start()}
                className="mt-4 min-h-12 rounded-full bg-primary px-8 font-black text-primary-foreground shadow-md hover:bg-primary/90"
              >
                {t.start}
              </TiltMazeButton>
            </div>
          </div>
        </GameContainer>
      </div>
    );
  return (
    <div ref={containerRef} className={`w-full ${isImmersive ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-4 overflow-y-auto' : ''}`}>
      <GameContainer title={t.title} subtitle={t.sub} onReset={() => start()}>
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex flex-1 gap-1">
              {(["easy", "medium", "hard"] as MazeDifficulty[]).map((d) => (
                <TiltMazeButton
                  key={d}
                  onClick={() => start(d)}
                  ariaLabel={`${t[d]} ${MAZE_SIZES[d]}²`}
                  className={`min-h-11 flex-1 rounded-xl border text-xs font-bold ${difficulty === d ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                >
                  {t[d]} {MAZE_SIZES[d]}²
                </TiltMazeButton>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <TiltMazeButton
                onClick={() => setSound((v) => !v)}
                className="min-h-11 min-w-11 rounded-xl border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"
                ariaLabel="Toggle Sound"
              >
                {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </TiltMazeButton>
              <TiltMazeButton
                onClick={togglePortal}
                className="min-h-11 min-w-11 rounded-xl border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"
                ariaLabel={isImmersive ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isImmersive ? <Minimize2 className="h-4 w-4 text-primary" /> : <Maximize2 className="h-4 w-4" />}
              </TiltMazeButton>
            </div>
          </div>
          {restored && (
            <p
              role="status"
              className="mb-3 rounded-xl bg-primary/10 p-3 text-center text-xs font-bold text-primary"
            >
              {t.restored}
            </p>
          )}
          <div className="mb-2 flex justify-between text-xs font-bold">
            <span>
              {t.time} {seconds}s
            </span>
            <span>
              {t.best} {best[difficulty] === undefined ? "—" : `${best[difficulty]}s`}
            </span>
          </div>
          <div
            className="relative aspect-square touch-none"
            onTouchStart={(e) => {
              const x = e.touches[0];
              touch.current = { x: x.clientX, y: x.clientY };
            }}
            onTouchEnd={(e) => {
              if (!touch.current) return;
              const x = e.changedTouches[0],
                dx = x.clientX - touch.current.x,
                dy = x.clientY - touch.current.y;
              touch.current = null;
              if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
              Math.abs(dx) > Math.abs(dy)
                ? go(0, dx > 0 ? 1 : -1)
                : go(dy > 0 ? 1 : -1, 0);
            }}
          >
            <div
              className="grid h-full w-full overflow-hidden rounded-2xl border-2 border-primary/40 bg-card"
              style={{ gridTemplateColumns: `repeat(${maze.length},1fr)` }}
              role="grid"
              aria-label={t.title}
            >
              {maze.flatMap((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    role="gridcell"
                    aria-label={`${r + 1},${c + 1}`}
                    className={`grid place-items-center ${cell ? "bg-primary/20" : "bg-card"}`}
                  >
                    {pos[0] === r && pos[1] === c ? (
                      <span className="h-3/4 w-3/4 rounded-full bg-accent shadow-sm" />
                    ) : r === maze.length - 1 && c === maze.length - 1 ? (
                      <img src={MAZE_SPRITES.exit} alt="" draggable={false} className="h-3/4 w-3/4 object-contain pointer-events-none" />
                    ) : (
                      ""
                    )}
                  </div>
                )),
              )}
            </div>
            {phase === "paused" && (
              <button
                onClick={() => setPhase("playing")}
                className="absolute inset-0 rounded-2xl bg-background/90 backdrop-blur-sm text-xl font-black text-foreground"
              >
                {t.resume}
              </button>
            )}
            {phase === "won" && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-background/95 backdrop-blur-sm p-4 border border-border"
                role="status"
              >
                <img
                  src={getSpriteUrl('trophy', 64)}
                  alt="Victory Trophy"
                  width={56}
                  height={56}
                  className="mb-2 drop-shadow-md animate-bounce"
                />
                <h3 className="px-5 text-center text-xl font-black">{t.win}</h3>
                <p className="mt-2 font-mono font-bold">{seconds}s</p>
                <div className="mt-4 flex gap-2">
                  <TiltMazeButton
                    onClick={handleShareCard}
                    className="min-h-12 rounded-full border border-border bg-card hover:bg-muted px-6 font-bold text-foreground flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    {shareCardCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
                    <span>{shareCardCopied ? "복사됨!" : "결과 공유"}</span>
                  </TiltMazeButton>
                  <TiltMazeButton
                    onClick={() => start()}
                    className="min-h-12 rounded-full bg-primary px-8 font-black text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                  >
                    {t.again}
                  </TiltMazeButton>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <TiltMazeButton
              onClick={() => go(0, -1)}
              ariaLabel={t.left}
              className="min-h-11 rounded-xl border border-border bg-card hover:bg-muted font-bold text-lg"
            >
              ←
            </TiltMazeButton>
            <TiltMazeButton
              onClick={() => go(-1, 0)}
              ariaLabel={t.up}
              className="min-h-11 rounded-xl border border-border bg-card hover:bg-muted font-bold text-lg"
            >
              ↑
            </TiltMazeButton>
            <TiltMazeButton
              onClick={() => go(0, 1)}
              ariaLabel={t.right}
              className="min-h-11 rounded-xl border border-border bg-card hover:bg-muted font-bold text-lg"
            >
              →
            </TiltMazeButton>
            <TiltMazeButton
              onClick={() => go(1, 0)}
              ariaLabel={t.down}
              className="min-h-11 rounded-xl border border-border bg-card hover:bg-muted font-bold text-lg"
            >
              ↓
            </TiltMazeButton>
            <TiltMazeButton
              onClick={() =>
                setPhase((p) =>
                  p === "playing" ? "paused" : p === "paused" ? "playing" : p,
                )
              }
              disabled={phase === "won"}
              className="min-h-11 rounded-xl border border-border bg-card hover:bg-muted font-bold text-xs disabled:opacity-40"
            >
              {phase === "paused" ? t.resume : t.pause}
            </TiltMazeButton>
            <TiltMazeButton
              onClick={() => setSound((v) => !v)}
              className="min-h-11 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold"
            >
              {t.sound} {sound ? "ON" : "OFF"}
            </TiltMazeButton>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t.hint}
          </p>
        </div>
      </GameContainer>
    </div>
  );
}
