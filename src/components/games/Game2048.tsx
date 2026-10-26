import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { GameShell } from "../ui/game/GameShell";
import {
  getBest,
  recordAchievementEvent,
  recordBest,
} from "../../lib/games/records";
import {
  loadReplayEnvelope,
  saveReplayEnvelope,
  verifyReplayEnvelope,
  type ReplayInput,
} from "../../lib/games/replay";
import {
  createGame2048Replay,
  game2048GhostBoards,
  replayGame2048,
  type Game2048ReplayAction,
} from "../../lib/games/game-2048-replay";
import {
  clearGame2048Save,
  loadGame2048Save,
  storeGame2048Save,
} from "../../lib/games/active-game-save";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  createGame2048,
  game2048Analysis,
  moveGame2048,
  restoreGame2048,
  undoGame2048,
  calculateBlitzTimeBonus,
  BLITZ_DURATION_SEC,
  type Game2048Mode,
  type Game2048Direction,
  type Game2048State,
} from "../../lib/games/game-2048";
import type { Game2048Theme } from "./Game2048PixiCanvas";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import {
  CORE_CUES,
  createCuePlayer,
  type CoreCue,
  type CuePlayer,
} from "../../lib/games/game-audio";
import { createHaptics } from "../../lib/games/haptics";
import { celebrate } from "../../lib/games/celebration";
import { GAME_2048_SPRITES } from "../../lib/games/sprites";
import { getGlobalBgmController } from "../../lib/games/bgm";
import {
  buildChallengeUrl,
  parseChallengeUrl,
  generateChallengeCopy,
  evaluateChallengeResult,
  encodeSeed,
} from "../../lib/games/seed-challenge";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import type { FlowPhase } from "../../lib/games/game-flow";

const Game2048PixiCanvas = lazy(() => import("./Game2048PixiCanvas"));

const COPY = {
  ko: {
    title: "2048 게임",
    subtitle: "Growth Logic",
    score: "점수",
    best: "최고 점수",
    over: "게임 종료",
    win: "2048 달성!",
    reset: "다시 시작",
    hint: "방향키 또는 스와이프로 이동",
    challengeWon: "도전 성공!",
    challengeLost: "도전 실패",
    rival: "상대",
    undo: "실행 취소",
  },
  en: {
    title: "2048 Game",
    subtitle: "Growth Logic",
    score: "Score",
    best: "Best",
    over: "Game Over",
    win: "2048 reached!",
    reset: "Reset",
    hint: "Arrow keys or swipe to move",
    challengeWon: "Challenge Won!",
    challengeLost: "Challenge Lost",
    rival: "Rival",
    undo: "Undo",
  },
  ja: {
    title: "2048ゲーム",
    subtitle: "Growth Logic",
    score: "スコア",
    best: "ベスト",
    over: "ゲーム終了",
    win: "2048達成！",
    reset: "リスタート",
    hint: "矢印キーまたはスワイプで移動",
    challengeWon: "挑戦成功！",
    challengeLost: "挑戦失敗",
    rival: "ライバル",
    undo: "元に戻す",
  },
  zh: {
    title: "2048游戏",
    subtitle: "Growth Logic",
    score: "分数",
    best: "最高分",
    over: "游戏结束",
    win: "达成2048！",
    reset: "重新开始",
    hint: "方向键或滑动操作",
    challengeWon: "挑战成功！",
    challengeLost: "挑战失败",
    rival: "对手",
    undo: "撤销",
  },
  fr: {
    title: "Jeu 2048",
    subtitle: "Growth Logic",
    score: "Score",
    best: "Record",
    over: "Partie terminée",
    win: "2048 atteint !",
    reset: "Recommencer",
    hint: "Flèches ou glissez pour jouer",
    challengeWon: "Défi réussi !",
    challengeLost: "Défi perdu",
    rival: "Adversaire",
    undo: "Annuler",
  },
  es: {
    title: "Juego 2048",
    subtitle: "Growth Logic",
    score: "Puntos",
    best: "Récord",
    over: "Fin del juego",
    win: "¡2048 logrado!",
    reset: "Reiniciar",
    hint: "Flechas o desliza para mover",
    challengeWon: "¡Desafío superado!",
    challengeLost: "Desafío no superado",
    rival: "Rival",
    undo: "Deshacer",
  },
} as const;

const LEGACY_BEST_KEY = "oiyo-2048-best";

const EXTRA = {
  ko: {
    pause: "일시정지",
    resume: "계속",
    restored: "게임을 복원했어요",
    sound: "소리",
    max: "최대 타일",
    empty: "빈 칸",
  },
  en: {
    pause: "Pause",
    resume: "Resume",
    restored: "Game restored",
    sound: "Sound",
    max: "Max tile",
    empty: "empty cells",
  },
  ja: {
    pause: "一時停止",
    resume: "再開",
    restored: "ゲームを復元しました",
    sound: "音",
    max: "最大タイル",
    empty: "空きマス",
  },
  zh: {
    pause: "暂停",
    resume: "继续",
    restored: "已恢复游戏",
    sound: "声音",
    max: "最大方块",
    empty: "空格",
  },
  fr: {
    pause: "Pause",
    resume: "Reprendre",
    restored: "Partie restaurée",
    sound: "Son",
    max: "Tuile max",
    empty: "cases vides",
  },
  es: {
    pause: "Pausa",
    resume: "Continuar",
    restored: "Partida restaurada",
    sound: "Sonido",
    max: "Ficha máxima",
    empty: "casillas vacías",
  },
} as const;

const Game2048: React.FC<{ locale?: string }> = ({ locale = "ko" }) => {
  const loc = locale as Locale;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } =
    useArcadePortal({ locale: loc });
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const x = EXTRA[locale as keyof typeof EXTRA] ?? EXTRA.en;
  const reducedMotion = usePrefersReducedMotion();

  const [phase, setPhase] = useState<FlowPhase>("title");
  // Pixi boots WebGL on mount; wait until the player leaves the title screen.
  const [canvasMounted, setCanvasMounted] = useState(false);
  useEffect(() => {
    if (phase !== "title") setCanvasMounted(true);
  }, [phase]);
  const [game, setGame] = useState<Game2048State>(() => createGame2048(1));
  const [best, setBest] = useState(0);
  const [muted, setMuted] = useState(false);
  const [hasGhost, setHasGhost] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const [theme, setTheme] = useState<Game2048Theme>("neon");
  const [gameMode, setGameMode] = useState<Game2048Mode>("classic");
  const [blitzTimeLeft, setBlitzTimeLeft] = useState<number>(BLITZ_DURATION_SEC);

  // Blitz mode countdown timer
  useEffect(() => {
    if (phase !== "play" || game.status !== "playing" || gameMode !== "blitz") return;

    const timer = setInterval(() => {
      setBlitzTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setPhase("result");
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, game.status, gameMode]);

  // Challenge Rival State
  const [challengerScore, setChallengerScore] = useState<number | undefined>();
  const [seedCode, setSeedCode] = useState<string>("");

  const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef(createHaptics());
  const seedRef = useRef<number | null>(null);
  const replayInputsRef = useRef<ReplayInput<Game2048ReplayAction>[]>([]);
  const ghostBoardsRef = useRef<(number | null)[][]>([]);
  const terminalRef = useRef(false);

  const cue = useCallback(
    (kind: CoreCue) => {
      if (muted || reducedMotion) return;
      try {
        cuesRef.current ??= createCuePlayer({ cues: CORE_CUES });
        void cuesRef.current.play(kind);
      } catch {
        /* audio blocked */
      }
    },
    [muted, reducedMotion]
  );

  // Procedural BGM Controller
  useEffect(() => {
    const bgm = getGlobalBgmController("arcade");
    if (phase === "play" && !muted && !reducedMotion) {
      bgm.start();
    } else {
      bgm.stop();
    }
    return () => {
      bgm.stop();
    };
  }, [phase, muted, reducedMotion]);

  const startRun = useCallback((seedOverride?: number) => {
    clearGame2048Save();
    const seed =
      seedOverride ??
      (typeof crypto !== "undefined"
        ? crypto.getRandomValues(new Uint32Array(1))[0]
        : Date.now() >>> 0);
    seedRef.current = seed >>> 0;
    setSeedCode(encodeSeed(seedRef.current));
    replayInputsRef.current = [];
    ghostBoardsRef.current = [];
    terminalRef.current = false;

    const prior = loadReplayEnvelope<Game2048ReplayAction>("game-2048");
    if (prior?.seed === seedRef.current) {
      try {
        if (verifyReplayEnvelope(prior, replayGame2048))
          ghostBoardsRef.current = game2048GhostBoards(prior);
      } catch {
        ghostBoardsRef.current = [];
      }
    }
    setHasGhost(ghostBoardsRef.current.length > 0);
    const opening = createGame2048(seedRef.current);
    setGame(opening);
    setPhase("play");
  }, []);

  const initGame = useCallback(() => startRun(), [startRun]);

  // Initial Boot & Challenge URL Detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      if (search) {
        const parsed = parseChallengeUrl(search);
        if (parsed.isChallenge) {
          setChallengerScore(parsed.challengerScore);
          startRun(parsed.seed);
          return;
        }
      }
    }

    const saved = loadGame2048Save();
    if (saved) {
      seedRef.current = null;
      replayInputsRef.current = [];
      ghostBoardsRef.current = [];
      setHasGhost(false);
      const restoredState = restoreGame2048(saved.board, saved.score);
      if (restoredState) {
        setGame(restoredState);
        setPhase("play");
      }
    }

    const existing = getBest("game-2048");
    if (existing) {
      setBest(existing.value);
      return;
    }

    try {
      const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY));
      if (Number.isFinite(legacy) && legacy > 0) {
        setBest(
          recordBest("game-2048", legacy, "score", undefined, {
            trackPlay: false,
          }).value
        );
      }
    } catch {
      /* ignore */
    }
  }, [startRun]);

  // Visibility Change Pause
  useEffect(() => {
    const hidden = () => {
      if (document.hidden && phase === "play") {
        setPhase("paused");
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [phase]);

  // Persist Active Board
  useEffect(() => {
    if (game.status !== "playing") {
      clearGame2048Save();
      return;
    }
    if (phase === "play" || phase === "paused") {
      storeGame2048Save({ board: game.board, score: game.score });
    }
  }, [game, phase]);

  // Terminal State Handling
  useEffect(() => {
    if (game.status === "playing") {
      terminalRef.current = false;
      return;
    }
    if (!terminalRef.current) {
      terminalRef.current = true;
      setPhase("result");
      recordAchievementEvent("game-2048", "played");
      if (game.status === "won") {
        cue("win");
        hapticsRef.current.fire("win");
        if (containerRef.current)
          celebrate(containerRef.current, { preset: "tiles" });
      } else if (game.status === "over") {
        cue("fail");
        hapticsRef.current.fire("fail");
      }
    }
  }, [game.status, cue, containerRef]);

  const move = useCallback(
    (direction: Game2048Direction) => {
      if (phase !== "play") return;
      const next = moveGame2048(game, direction);
      if (next === game) return;

      const nextInputs = [
        ...replayInputsRef.current,
        { tick: game.moves, input: { type: "move" as const, direction } },
      ];
      replayInputsRef.current = nextInputs;
      setGame(next);

      if (next.lastGain > 0) {
        cue("combo");
        hapticsRef.current.fire("combo");
        getGlobalBgmController().duck(0.2, 400);
        if (gameMode === "blitz") {
          setBlitzTimeLeft((t) =>
            Math.min(BLITZ_DURATION_SEC, t + calculateBlitzTimeBonus(next.lastGain))
          );
        }
      } else {
        cue("place");
        hapticsRef.current.fire("place");
      }

      if (next.score > best) {
        if (seedRef.current !== null) {
          try {
            const replay = createGame2048Replay(
              seedRef.current,
              next,
              nextInputs
            );
            if (verifyReplayEnvelope(replay, replayGame2048))
              saveReplayEnvelope(replay);
          } catch {
            /* drifted replay */
          }
        }
        recordAchievementEvent("game-2048", "personal-best");
        setBest(
          recordBest("game-2048", next.score, "score", undefined, {
            trackPlay: false,
          }).value
        );
      }
    },
    [game, best, phase, cue]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== "play" || game.status !== "playing") return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        move(e.key.replace("Arrow", "").toLowerCase() as Game2048Direction);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move, phase, game.status]);

  const analysis = game2048Analysis(game);
  const ghostBoard = ghostBoardsRef.current[game.moves];
  const challengeEval = evaluateChallengeResult(game.score, challengerScore);

  const canUndo = (game.history?.length ?? 0) > 0 && phase === "play" && game.status === "playing";

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    setGame((prev) => undoGame2048(prev));
    cue("tap");
    hapticsRef.current.fire("tap");
  }, [canUndo, cue]);

  // Social Challenge Link Sharing
  const handleShareChallenge = useCallback(() => {
    const currentSeed = seedRef.current ?? 1;
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://game.oiyo.net";
    const challengeUrl = buildChallengeUrl({
      baseUrl: origin,
      locale,
      slug: "game-2048",
      seed: currentSeed,
      score: game.score,
    });

    const copyText = generateChallengeCopy({
      locale,
      gameTitle: t.title,
      score: game.score,
      url: challengeUrl,
    });

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(copyText).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      });
    }
  }, [game.score, locale, t.title]);

  // Social Snapshot Card Generation (Canvas PNG to Clipboard / Download)
  const handleShareCard = useCallback(async () => {
    try {
      const currentSeed = seedRef.current ?? 1;
      const canvas = createShareCardCanvas({
        title: t.title,
        subtitle: t.subtitle,
        score: game.score,
        bestScore: best,
        slug: "game-2048",
        seedCode: seedCode || encodeSeed(currentSeed),
        qrUrl: typeof window !== "undefined" ? window.location.href : undefined,
        customStats: [
          { label: "MAX TILE", value: analysis.max },
          { label: "MOVES", value: game.moves },
        ],
      });

      const copied = await copyShareCardToClipboard(canvas);
      if (copied) {
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2500);
      } else {
        downloadShareCard(canvas, `oiyo-2048-${game.score}pts.png`);
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  }, [t.title, t.subtitle, game.score, best, seedCode, analysis.max, game.moves]);

  return (
    <GameShell
      title={t.title}
      subtitle={t.subtitle}
      keyart={GAME_2048_SPRITES.keyart}
      phase={phase}
      score={game.score}
      best={best}
      muted={muted}
      onToggleMute={() => setMuted((v) => !v)}
      isImmersive={isImmersive}
      onTogglePortal={togglePortal}
      containerRef={containerRef}
      portalLabels={portalLabels}
      onStart={initGame}
      onResume={() => setPhase("play")}
      onPause={() => setPhase("paused")}
      onRetry={initGame}
      resultTitle={game.status === "won" ? t.win : t.over}
      resultSubtitle={`${x.max} ${analysis.max} · ${analysis.empty} ${x.empty}`}
      resultStats={[
        { label: t.score, value: game.score.toLocaleString() },
        { label: t.best, value: best.toLocaleString() },
        { label: "MAX TILE", value: analysis.max },
        { label: "MOVES", value: game.moves },
      ]}
      onShare={handleShareChallenge}
      shareCopied={shareCopied}
      onShareCard={handleShareCard}
      shareCardCopied={shareCardCopied}
      challengeUrl={buildChallengeUrl({
        baseUrl:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://game.oiyo.net",
        locale,
        slug: "game-2048",
        seed: seedRef.current ?? 1,
        score: game.score,
      })}
      challengeInfo={
        challengerScore !== undefined
          ? {
              challengerScore,
              outcome: challengeEval.outcome,
              diff: challengeEval.diff,
            }
          : undefined
      }
      controlsHint={t.hint}
      extraHeaderActions={
        challengerScore !== undefined ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-center">
            <span className="block text-xs font-black uppercase text-destructive">
              RIVAL
            </span>
            <span className="font-mono text-xs font-black text-foreground">
              {challengerScore.toLocaleString()}
            </span>
          </div>
        ) : null
      }
    >
      {/* Mode Switcher & Blitz Timer */}
      <div className="mx-auto mb-2 flex w-full max-w-sm items-center justify-between gap-2 px-1">
        <div className="inline-flex rounded-xl border border-border bg-card/60 p-1">
          <button
            type="button"
            onClick={() => {
              setGameMode("classic");
              initGame();
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              gameMode === "classic"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            클래식
          </button>
          <button
            type="button"
            onClick={() => {
              setGameMode("blitz");
              setBlitzTimeLeft(BLITZ_DURATION_SEC);
              initGame();
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
              gameMode === "blitz"
                ? "bg-warning text-warning-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>⚡</span>
            <span>60초 블리츠</span>
          </button>
        </div>

        {gameMode === "blitz" && (
          <div
            className={`px-3 py-1 rounded-xl border font-mono text-xs font-black flex items-center gap-1 ${
              blitzTimeLeft <= 15
                ? "border-destructive/80 bg-destructive/15 text-destructive animate-pulse"
                : "border-border bg-card/80 text-foreground"
            }`}
          >
            <span>⏱️</span>
            <span>{blitzTimeLeft}s</span>
          </div>
        )}
      </div>

      {/* Undo & Visual Theme Controls */}
      <div className="mx-auto mb-3 flex w-full max-w-sm items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-xs font-bold text-foreground transition-all hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          aria-label={t.undo}
        >
          <span aria-hidden="true">⤺</span>
          <span>{t.undo}</span>
          {(game.history?.length ?? 0) > 0 && (
            <span className="rounded-full bg-primary/20 px-1.5 text-primary text-xs font-black">
              {game.history?.length}
            </span>
          )}
        </button>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card/60 p-1">
          {(["classic", "neon", "pastel"] as const).map((th) => (
            <button
              key={th}
              type="button"
              onClick={() => setTheme(th)}
              className={`rounded-lg px-2 py-1 text-xs font-black capitalize transition-all ${
                theme === th
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {th}
            </button>
          ))}
        </div>
      </div>

      <div className="relative aspect-square w-full max-w-sm mx-auto">
        {canvasMounted ? (
          <Suspense fallback={null}>
            <Game2048PixiCanvas
              board={game.board}
              onDirection={move}
              muted={muted}
              reducedMotion={reducedMotion}
              theme={theme}
            />
          </Suspense>
        ) : (
          <div className="absolute inset-0 rounded-2xl bg-muted/60" aria-hidden="true" />
        )}
      </div>

      {/* Mobile Touch D-Pad */}
      <div
        className="mt-4 flex flex-col items-center sm:pointer-fine:hidden select-none touch-none"
        aria-label="Touch Controls"
      >
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            move("up");
          }}
          className="size-14 rounded-2xl bg-muted/80 active:bg-primary active:text-primary-foreground text-xl font-bold flex items-center justify-center border border-border shadow-sm touch-none"
          aria-label="Up"
        >
          ▲
        </button>
        <div className="flex gap-4 my-1">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              move("left");
            }}
            className="size-14 rounded-2xl bg-muted/80 active:bg-primary active:text-primary-foreground text-xl font-bold flex items-center justify-center border border-border shadow-sm touch-none"
            aria-label="Left"
          >
            ◀
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              move("down");
            }}
            className="size-14 rounded-2xl bg-muted/80 active:bg-primary active:text-primary-foreground text-xl font-bold flex items-center justify-center border border-border shadow-sm touch-none"
            aria-label="Down"
          >
            ▼
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              move("right");
            }}
            className="size-14 rounded-2xl bg-muted/80 active:bg-primary active:text-primary-foreground text-xl font-bold flex items-center justify-center border border-border shadow-sm touch-none"
            aria-label="Right"
          >
            ▶
          </button>
        </div>
      </div>

      {hasGhost && ghostBoard && phase === "play" && (
        <section
          className="mx-auto mt-4 w-full max-w-sm rounded-2xl border border-chart-2/40 bg-chart-2/10 p-3"
          aria-label="PB Ghost Board"
        >
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-chart-2">
            ◇ PB GHOST BOARD · {game.moves}
          </p>
          <div className="grid grid-cols-4 gap-1">
            {ghostBoard.map((value, index) => (
              <div
                key={index}
                className="grid aspect-square place-items-center rounded bg-background/80 text-xs font-black text-foreground"
              >
                {value ?? ""}
              </div>
            ))}
          </div>
        </section>
      )}
    </GameShell>
  );
};

export default Game2048;
