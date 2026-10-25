import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import {
  getStreak,
  recordStreak,
  type StreakStats,
} from "../../lib/games/records";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  createWordle,
  evaluateWordleGuess,
  explainWordleSubmit,
  inputWordle,
  submitWordle,
  wordleDateSeed,
  type WordleMark,
  type WordleMode,
  type WordleState,
} from "../../lib/games/wordle";
import {
  clearWordleSave,
  loadWordleSave,
  storeWordleSave,
} from "../../lib/games/wordle-save";
import {
  wordleAnalyticsPayload,
  type WordleAnalyticsEvent,
} from "../../lib/games/wordle-analytics";
import { minutesUntilNextDaily } from "../../lib/games/daily";
import { DailyPuzzleCalendarModal } from "../ui/game/DailyPuzzleCalendarModal";
import { recordDailyPuzzleClear, getTodayDateStr } from "../../lib/games/daily-calendar";
import { Calendar } from "lucide-react";
import { Spinner } from "../ui/spinner";
import {
  CORE_CUES,
  createCuePlayer,
  type CoreCue,
  type CuePlayer,
} from "../../lib/games/game-audio";
import { createHaptics } from "../../lib/games/haptics";
import { celebrate } from "../../lib/games/celebration";
import { WORDLE_SPRITES } from "../../lib/games/sprites";
import { GameShell } from "../ui/game/GameShell";
import type { FlowPhase } from "../../lib/games/game-flow";
import { getGlobalBgmController } from "../../lib/games/bgm";
import {
  buildChallengeUrl,
  parseChallengeUrl,
  generateChallengeCopy,
  encodeSeed,
} from "../../lib/games/seed-challenge";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import type { Locale } from "../../lib/i18n";

const DATA_BASE = "/data/wordle";
const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

const localDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const formatTime = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

const COPY = {
  ko: {
    title: "워들 데일리 퍼즐",
    subtitle: "매일 새로운 5글자 영단어 퍼즐",
    loading: "단어 불러오는 중…",
    fail: "단어 데이터를 불러오지 못했어요",
    daily: "오늘의 단어",
    random: "무작위 연습",
    challenge: "1:1 시드 대결",
    restored: "이전 게임을 복원했어요",
    short: "글자 수가 부족해요",
    invalid: "단어 목록에 없어요",
    hardFail: "확인된 글자를 그대로 써야 해요",
    hard: "하드 모드",
    pause: "일시정지",
    resume: "계속하기",
    sound: "소리",
    won: "정답이에요!",
    lost: (w: string) => `정답은 ${w}`,
    again: "다시 하기",
    attempts: "시도",
    time: "시간",
    streak: (s: StreakStats) =>
      `연승 ${s.currentStreak} · 최고 ${s.maxStreak} · ${s.won}/${s.played}승`,
    share: "결과 복사",
    correct: "정확한 위치",
    present: "다른 위치에 있음",
    absent: "단어에 없음",
    hint: "실제 키보드 또는 화면 자판을 사용하세요.",
  },
  en: {
    title: "Wordle Daily Puzzle",
    subtitle: "Daily 5-letter word puzzle",
    loading: "Loading words…",
    fail: "Failed to load word data",
    daily: "Daily word",
    random: "Random practice",
    challenge: "1v1 Seed Match",
    restored: "Previous game restored",
    short: "Not enough letters",
    invalid: "Not in word list",
    hardFail: "Reuse the confirmed letters.",
    hard: "Hard mode",
    pause: "Pause",
    resume: "Resume",
    sound: "Sound",
    won: "Correct!",
    lost: (w: string) => `The word was ${w}`,
    again: "Play again",
    attempts: "Attempts",
    time: "Time",
    streak: (s: StreakStats) =>
      `Streak ${s.currentStreak} · Best ${s.maxStreak} · ${s.won}/${s.played} won`,
    share: "Copy result",
    correct: "Correct position",
    present: "Present elsewhere",
    absent: "Not in word",
    hint: "Use your physical keyboard or the keys on screen.",
  },
  ja: {
    title: "ワードル デイリーパズル",
    subtitle: "毎日新しい5文字の英単語パズル",
    loading: "単語を読み込み中…",
    fail: "単語データを読み込めません",
    daily: "今日の単語",
    random: "ランダム練習",
    challenge: "1v1 シード対決",
    restored: "前のゲームを復元しました",
    short: "文字数が足りません",
    invalid: "単語リストにありません",
    hardFail: "確定した文字を使ってください",
    hard: "ハードモード",
    pause: "一時停止",
    resume: "再開",
    sound: "サウンド",
    won: "正解！",
    lost: (w: string) => `正解は ${w}`,
    again: "もう一度",
    attempts: "回数",
    time: "時間",
    streak: (s: StreakStats) =>
      `連勝 ${s.currentStreak} · 最高 ${s.maxStreak} · ${s.won}/${s.played}勝`,
    share: "結果をコピー",
    correct: "正しい位置",
    present: "別の位置にある",
    absent: "単語にない",
    hint: "キーボードまたは画面のキーを使用してください。",
  },
  zh: {
    title: "Wordle 每日单词",
    subtitle: "每日5字母英文单词谜题",
    loading: "正在加载单词…",
    fail: "无法加载单词数据",
    daily: "每日单词",
    random: "随机练习",
    challenge: "1v1 种子对决",
    restored: "已恢复上一局",
    short: "字母数不足",
    invalid: "不在单词表中",
    hardFail: "必须使用已确认的字母",
    hard: "困难模式",
    pause: "暂停",
    resume: "继续",
    sound: "声音",
    won: "答对了！",
    lost: (w: string) => `答案是 ${w}`,
    again: "再玩一次",
    attempts: "次数",
    time: "时间",
    streak: (s: StreakStats) =>
      `连胜 ${s.currentStreak} · 最佳 ${s.maxStreak} · ${s.won}/${s.played}胜`,
    share: "复制结果",
    correct: "位置正确",
    present: "在其他位置",
    absent: "单词中没有",
    hint: "请使用实体键盘或屏幕键盘。",
  },
  fr: {
    title: "Wordle Quotidien",
    subtitle: "Mot anglais quotidien en 5 lettres",
    loading: "Chargement des mots…",
    fail: "Échec du chargement des mots",
    daily: "Mot du jour",
    random: "Entraînement aléatoire",
    challenge: "Duel 1v1 par graine",
    restored: "Partie restaurée",
    short: "Pas assez de lettres",
    invalid: "Absent de la liste",
    hardFail: "Réutilisez les lettres confirmées.",
    hard: "Mode difficile",
    pause: "Pause",
    resume: "Reprendre",
    sound: "Son",
    won: "Correct !",
    lost: (w: string) => `Le mot était ${w}`,
    again: "Rejouer",
    attempts: "Essais",
    time: "Temps",
    streak: (s: StreakStats) =>
      `Série ${s.currentStreak} · Record ${s.maxStreak} · ${s.won}/${s.played} gagnées`,
    share: "Copier le résultat",
    correct: "Bonne position",
    present: "Présent ailleurs",
    absent: "Absent du mot",
    hint: "Utilisez le clavier physique ou les touches à l’écran.",
  },
  es: {
    title: "Wordle Diario",
    subtitle: "Palabra inglesa diaria de 5 letras",
    loading: "Cargando palabras…",
    fail: "No se pudieron cargar las palabras",
    daily: "Palabra diaria",
    random: "Práctica aleatoria",
    challenge: "Duelo 1v1 por semilla",
    restored: "Partida restaurada",
    short: "Faltan letras",
    invalid: "No está en la lista",
    hardFail: "Reutiliza las letras confirmadas.",
    hard: "Modo difícil",
    pause: "Pausa",
    resume: "Continuar",
    sound: "Sonido",
    won: "¡Correcto!",
    lost: (w: string) => `La palabra era ${w}`,
    again: "Jugar otra vez",
    attempts: "Intentos",
    time: "Tiempo",
    streak: (s: StreakStats) =>
      `Racha ${s.currentStreak} · Mejor ${s.maxStreak} · ${s.won}/${s.played} ganadas`,
    share: "Copiar resultado",
    correct: "Posición correcta",
    present: "Está en otra posición",
    absent: "No está en la palabra",
    hint: "Usa el teclado físico o las teclas en pantalla.",
  },
} as const;

const NEXT_COPY = {
  ko: (m: number) => `다음 단어까지 ${Math.floor(m / 60)}시간 ${m % 60}분`,
  en: (m: number) => `Next word in ${Math.floor(m / 60)}h ${m % 60}m`,
  ja: (m: number) => `次の単語まで ${Math.floor(m / 60)}時間${m % 60}分`,
  zh: (m: number) => `距下一单词 ${Math.floor(m / 60)}小时${m % 60}分`,
  fr: (m: number) => `Prochain mot dans ${Math.floor(m / 60)} h ${m % 60} min`,
  es: (m: number) => `Próxima palabra en ${Math.floor(m / 60)} h ${m % 60} min`,
};

const markSymbol: Record<WordleMark, string> = {
  correct: "✓",
  present: "◆",
  absent: "×",
};

const markClass: Record<WordleMark, string> = {
  correct: "border-chart-2 bg-chart-2 text-primary-foreground font-black",
  present: "border-chart-4 bg-chart-4 text-foreground font-black",
  absent: "border-muted bg-muted text-muted-foreground",
};

export default function WordleGame({ locale = "en" }: { locale?: string }) {
  const loc = locale as Locale;
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const reduced = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } =
    useArcadePortal({ locale: loc });

  const [phase, setPhase] = useState<FlowPhase>("title");
  const [targets, setTargets] = useState<string[]>([]);
  const [valid, setValid] = useState<Set<string>>(new Set());
  const [game, setGame] = useState<WordleState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hard, setHard] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [nextMinutes, setNextMinutes] = useState(() => minutesUntilNextDaily());
  const nextCopy =
    NEXT_COPY[locale as keyof typeof NEXT_COPY] ?? NEXT_COPY.en;

  // Viral Challenge State
  const [seedCode, setSeedCode] = useState<string>("");
  const [challengerTries, setChallengerTries] = useState<number | undefined>();
  const [shareCopied, setShareCopied] = useState(false);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dailyDate, setDailyDate] = useState(() => getTodayDateStr());
  const [guessDist, setGuessDist] = useState<Record<number, number>>(() => {
    if (typeof window === "undefined") return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    try {
      const raw = localStorage.getItem("oiyo_wordle_dist");
      return raw ? JSON.parse(raw) : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    } catch {
      return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    }
  });

  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("wordle_sound_muted") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("wordle_sound_muted", String(muted));
    } catch {
      // SSR fallback
    }
  }, [muted]);

  const elapsedBase = useRef(0);
  const startedAt = useRef<number | null>(null);
  const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef(createHaptics());
  const recorded = useRef(false);
  const analyticsStarted = useRef(false);
  const analyticsCompleted = useRef(false);
  const guessCount = useRef(0);
  const [revealedCols, setRevealedCols] = useState(5);
  const target =
    game && targets[game.targetIndex]
      ? targets[game.targetIndex].toUpperCase()
      : "";

  const cue = useCallback(
    (kind: CoreCue) => {
      if (muted || reduced) return;
      try {
        cuesRef.current ??= createCuePlayer({ cues: CORE_CUES });
        void cuesRef.current.play(kind);
      } catch {
        /* audio blocked */
      }
    },
    [muted, reduced]
  );

  // Procedural Zen BGM Controller
  useEffect(() => {
    const bgm = getGlobalBgmController("zen");
    if (phase === "play" && !muted && !reduced) {
      bgm.start();
    } else {
      bgm.stop();
    }
    return () => {
      bgm.stop();
    };
  }, [phase, muted, reduced]);

  const track = useCallback(
    (
      event: WordleAnalyticsEvent,
      mode: WordleMode,
      details: Record<string, string | number> = {}
    ) => {
      const analytics = window as Window & {
        gtag?: (...args: unknown[]) => void;
      };
      analytics.gtag?.("event", event, {
        ...wordleAnalyticsPayload({ mode, hardMode: hard }),
        ...details,
      });
    },
    [hard]
  );

  const start = useCallback(
    (mode: WordleMode, seedOverride?: number) => {
      if (!targets.length) return;
      const date = mode === "daily" ? localDateKey() : null;
      const seed =
        seedOverride ??
        (mode === "daily"
          ? wordleDateSeed(date!)
          : (crypto.getRandomValues?.(new Uint32Array(1))[0] ?? Date.now()) >>>
            0);

      setSeedCode(encodeSeed(seed));
      clearWordleSave();
      setGame(createWordle(seed, targets.length, mode, date));
      setPhase("play");
      setElapsed(0);
      elapsedBase.current = 0;
      startedAt.current = Date.now();
      recorded.current = false;
      analyticsStarted.current = false;
      analyticsCompleted.current = false;
      guessCount.current = 0;
      setRevealedCols(5);
      setError("");
    },
    [targets]
  );

  // Boot: Word Bank Load & Seed Challenge URL Detection
  useEffect(() => {
    Promise.all([
      fetch(`${DATA_BASE}/target-words-5.json`).then((r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<string[]>;
      }),
      fetch(`${DATA_BASE}/valid-words-5.json`).then((r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<string[]>;
      }),
    ])
      .then(([targetWords, validWords]) => {
        setTargets(targetWords);
        setValid(new Set(validWords.map((w) => w.toUpperCase())));

        // Check URL for seed challenge
        if (typeof window !== "undefined" && window.location.search) {
          const parsed = parseChallengeUrl(window.location.search);
          if (parsed.isChallenge) {
            setSeedCode(parsed.seedCode);
            setChallengerTries(parsed.challengerScore);
            clearWordleSave();
            setGame(createWordle(parsed.seed, targetWords.length, "challenge", null));
            setPhase("play");
            guessCount.current = 0;
            startedAt.current = Date.now();
            setLoading(false);
            return;
          }
        }

        const saved = loadWordleSave();
        if (
          saved &&
          saved.state.targetCount === targetWords.length &&
          !(
            saved.state.mode === "daily" &&
            saved.state.dateKey !== localDateKey()
          )
        ) {
          setGame(saved.state);
          guessCount.current = saved.state.guesses.length;
          setRevealedCols(5);
          setElapsed(saved.elapsedMs);
          elapsedBase.current = saved.elapsedMs;
          setPhase("play");
        } else {
          clearWordleSave();
          const date = localDateKey();
          setGame(
            createWordle(
              wordleDateSeed(date),
              targetWords.length,
              "daily",
              date
            )
          );
          guessCount.current = 0;
          startedAt.current = Date.now();
        }
        setLoading(false);
      })
      .catch(() => {
        setError(t.fail);
        setLoading(false);
      });
    setStats(getStreak("wordle"));
  }, [t.fail]);

  // Elapsed Timer
  useEffect(() => {
    if (!game || game.status !== "playing" || phase !== "play" || startedAt.current === null)
      return;
    const id = setInterval(
      () =>
        setElapsed(
          elapsedBase.current + Date.now() - (startedAt.current ?? Date.now())
        ),
      250
    );
    return () => clearInterval(id);
  }, [game?.status, phase]);

  useEffect(() => {
    const update = () => setNextMinutes(minutesUntilNextDaily());
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Save State and Record Analytics
  useEffect(() => {
    if (!game) return;
    if (game.status === "playing") {
      storeWordleSave(game, elapsed);
    } else {
      clearWordleSave();
      setPhase("result");
      if (!analyticsCompleted.current) {
        analyticsCompleted.current = true;
        track("game_complete", game.mode, {
          attempts: game.guesses.length,
          result: game.status,
        });
      }
      if (!recorded.current && game.mode === "daily") {
        recorded.current = true;
        setStats(recordStreak("wordle", game.status === "won"));
        if (game.status === "won") {
          recordDailyPuzzleClear("wordle", dailyDate);
          setGuessDist((prev) => {
            const count = game.guesses.length;
            const next = { ...prev, [count]: (prev[count] ?? 0) + 1 };
            try {
              localStorage.setItem("oiyo_wordle_dist", JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      }
    }
  }, [game, elapsed, track]);

  // Flip Animation on New Guess
  useEffect(() => {
    if (!game) return;
    if (game.guesses.length === guessCount.current) return;
    const grew = game.guesses.length > guessCount.current;
    guessCount.current = game.guesses.length;
    if (!grew || reduced) {
      setRevealedCols(5);
      return;
    }
    setRevealedCols(0);
    let col = 0;
    const id = window.setInterval(() => {
      col += 1;
      setRevealedCols(col);
      if (col >= 5) window.clearInterval(id);
    }, 90);
    return () => window.clearInterval(id);
  }, [game?.guesses.length, reduced]);

  // Pause & Resume
  const pause = useCallback(() => {
    if (!game || game.status !== "playing") return;
    if (phase === "paused") {
      startedAt.current = Date.now();
      setPhase("play");
    } else {
      elapsedBase.current = elapsed;
      startedAt.current = null;
      setPhase("paused");
      storeWordleSave(game, elapsed);
    }
  }, [game, phase, elapsed]);

  useEffect(() => {
    const hidden = () => {
      if (document.hidden && phase === "play") pause();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [pause, phase]);

  const submit = useCallback(() => {
    if (!game || phase !== "play" || !target) return;
    const reason = explainWordleSubmit(game, target, valid.has(game.current), hard);
    if (reason) {
      setError(
        reason === "too-short"
          ? t.short
          : reason === "invalid"
          ? t.invalid
          : t.hardFail
      );
      cue("fail");
      hapticsRef.current.fire("fail");
      return;
    }
    if (!analyticsStarted.current) {
      analyticsStarted.current = true;
      track("game_start", game.mode);
    }

    const next = submitWordle(game, target, true, hard);
    setError("");
    setGame(next);

    // Audio ducking and SFX
    if (next.status === "won") {
      cue("win");
      hapticsRef.current.fire("win");
      getGlobalBgmController().duck(0.1, 800);
      if (containerRef.current) celebrate(containerRef.current, { preset: "cards" });
    } else if (next.status === "lost") {
      cue("fail");
      hapticsRef.current.fire("fail");
    } else {
      cue("place");
      hapticsRef.current.fire("place");
      getGlobalBgmController().duck(0.4, 250);
    }
  }, [game, phase, target, valid, hard, t, track, cue, containerRef]);

  const key = useCallback(
    (value: string) => {
      if (!game || phase !== "play" || game.status !== "playing") return;
      if (value === "ENTER") {
        submit();
        return;
      }
      const normalized = value === "⌫" ? "BACKSPACE" : value;
      const next = inputWordle(game, normalized);
      if (next !== game) {
        setGame(next);
        setError("");
        cue("tap");
        hapticsRef.current.fire("tap");
      }
    },
    [game, phase, submit, cue]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (phase !== "play") return;
      const value =
        event.key === "Enter"
          ? "ENTER"
          : event.key === "Backspace"
          ? "BACKSPACE"
          : event.key.toUpperCase();
      if (value === "ENTER" || value === "BACKSPACE" || /^[A-Z]$/.test(value)) {
        event.preventDefault();
        key(value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, phase]);

  const evidence = useMemo(() => {
    const order = { absent: 1, present: 2, correct: 3 };
    const map: Record<string, WordleMark> = {};
    if (!target) return map;
    for (const guess of game?.guesses ?? [])
      evaluateWordleGuess(guess, target).forEach((mark, i) => {
        if (!map[guess[i]] || order[mark] > order[map[guess[i]]])
          map[guess[i]] = mark;
      });
    return map;
  }, [game?.guesses, target]);

  // Social Challenge Invite Link Copy
  const handleShareChallenge = useCallback(() => {
    if (!game) return;
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://game.oiyo.net";
    const challengeUrl = buildChallengeUrl({
      baseUrl: origin,
      locale,
      slug: "wordle",
      seed: game.seed,
      score: game.status === "won" ? game.guesses.length : undefined,
    });

    const copyText = generateChallengeCopy({
      locale,
      gameTitle: t.title,
      score: game.status === "won" ? game.guesses.length : undefined,
      url: challengeUrl,
    });

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(copyText).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      });
    }
  }, [game, locale, t.title]);

  // 600x600 Dynamic Canvas Social Score Card
  const handleShareCard = useCallback(async () => {
    if (!game) return;
    try {
      const triesText = game.status === "won" ? `${game.guesses.length}/6` : "X/6";
      const canvas = createShareCardCanvas({
        title: t.title,
        subtitle: "5-LETTER WORD PUZZLE",
        score: game.guesses.length,
        bestScore: stats?.maxStreak ?? 1,
        slug: "wordle",
        seedCode: seedCode || encodeSeed(game.seed),
        qrUrl: typeof window !== "undefined" ? window.location.href : undefined,
        durationSeconds: Math.floor(elapsed / 1000),
        customStats: [
          { label: "RESULT", value: triesText },
          { label: "TIME", value: formatTime(elapsed) },
        ],
      });

      const copied = await copyShareCardToClipboard(canvas);
      if (copied) {
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2500);
      } else {
        downloadShareCard(canvas, `oiyo-wordle-${triesText}.png`);
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  }, [game, t.title, stats?.maxStreak, seedCode, elapsed]);

  if (loading) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3">
        <Spinner className="size-8 text-primary motion-reduce:animate-none" />
        <p className="text-xs font-bold text-muted-foreground">{t.loading}</p>
      </div>
    );
  }

  if (!game) {
    return (
      <p role="alert" className="p-6 text-center font-bold text-destructive">
        {error || t.fail}
      </p>
    );
  }

  const display = [
    ...game.guesses,
    game.current,
    ...Array(Math.max(0, 6 - game.guesses.length - 1)).fill(""),
  ].slice(0, 6);

  // Rival evaluation (fewer attempts = better)
  const challengeEval = (() => {
    if (challengerTries === undefined) return { outcome: "solo" as const, diff: 0 };
    if (game.status !== "won") return { outcome: "lose" as const, diff: 6 - challengerTries };
    const diff = challengerTries - game.guesses.length; // positive = I took fewer tries (win)
    if (diff > 0) return { outcome: "win" as const, diff };
    if (diff < 0) return { outcome: "lose" as const, diff };
    return { outcome: "tie" as const, diff: 0 };
  })();

  return (
    <GameShell
      title={t.title}
      subtitle={t.subtitle}
      keyart={WORDLE_SPRITES.keyart}
      phase={phase}
      score={game.guesses.length}
      best={stats?.maxStreak ?? 0}
      muted={muted}
      onToggleMute={() => setMuted((v) => !v)}
      isImmersive={isImmersive}
      onTogglePortal={togglePortal}
      portalLabels={portalLabels}
      containerRef={containerRef}
      onStart={() => start("daily")}
      onResume={() => setPhase("play")}
      onPause={pause}
      onRetry={() => start(game.mode)}
      resultTitle={game.status === "won" ? t.won : t.lost(target)}
      resultSubtitle={`${t.attempts} ${game.guesses.length}/6 · ${t.time} ${formatTime(elapsed)}${game.mode === 'daily' ? ` · ${nextCopy(nextMinutes)}` : ''}`}
      resultStats={[
        { label: t.attempts, value: `${game.guesses.length}/6` },
        { label: t.time, value: formatTime(elapsed) },
        { label: "MODE", value: game.mode.toUpperCase() },
        {
          label: "STREAK",
          value: `${stats?.currentStreak ?? 0} (Max ${stats?.maxStreak ?? 0})`,
        },
      ]}
      onShare={handleShareChallenge}
      shareCopied={shareCopied}
      onShareCard={handleShareCard}
      shareCardCopied={shareCardCopied}
      challengeInfo={
        challengerTries !== undefined
          ? {
              challengerScore: challengerTries,
              outcome: challengeEval.outcome,
              diff: challengeEval.diff,
            }
          : undefined
      }
      controlsHint={t.hint}
      extraHeaderActions={
        <div className="flex items-center gap-1.5">
          {challengerTries !== undefined && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-2 py-1 text-center">
              <span className="block text-xs font-black uppercase text-destructive">
                RIVAL
              </span>
              <span className="font-mono text-xs font-black text-foreground">
                {challengerTries} tries
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsCalendarOpen(true)}
            aria-label="과거 퍼즐 캘린더 아카이브"
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 text-xs font-bold text-foreground hover:bg-muted"
          >
            <Calendar className="size-4" />
            <span className="hidden sm:inline">아카이브</span>
          </button>
          <button
            type="button"
            onClick={() => setHard((v) => !v)}
            aria-pressed={hard}
            className={`min-h-11 rounded-xl border border-border px-3 text-xs font-bold transition-colors ${
              hard ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.hard}
          </button>
        </div>
      }
    >
      <div className="not-prose mx-auto flex max-w-lg select-none flex-col items-center gap-3 px-1 py-1">
        {/* Mode Selector Buttons */}
        <div className="flex w-full flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => start("daily")}
            aria-pressed={game.mode === "daily"}
            className={`min-h-11 rounded-xl border border-border px-3 text-xs font-bold transition-colors ${
              game.mode === "daily"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/40 text-foreground hover:bg-muted"
            }`}
          >
            {t.daily}
          </button>
          <button
            type="button"
            onClick={() => start("random")}
            aria-pressed={game.mode === "random"}
            className={`min-h-11 rounded-xl border border-border px-3 text-xs font-bold transition-colors ${
              game.mode === "random"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/40 text-foreground hover:bg-muted"
            }`}
          >
            {t.random}
          </button>
          {seedCode && (
            <span className="inline-flex min-h-11 items-center rounded-xl border border-border bg-muted/40 px-3 font-mono text-xs font-bold text-muted-foreground">
              SEED #{seedCode}
            </span>
          )}
        </div>

        {/* Wordle 5x6 Board Grid */}
        <div className="grid gap-1.5 py-1" role="grid" aria-label="Wordle Grid">
          {display.map((word, row) => {
            const submitted = row < game.guesses.length;
            const marks = submitted ? evaluateWordleGuess(word, target) : [];
            const isLatest = submitted && row === game.guesses.length - 1;
            return (
              <div key={row} className="flex gap-1.5" role="row">
                {Array.from({ length: 5 }, (_, column) => {
                  const mark = marks[column];
                  const letter = word[column] ?? "";
                  const shown = submitted && (!isLatest || column < revealedCols);
                  return (
                    <div
                      key={column}
                      role="gridcell"
                      aria-label={`${letter || "empty"}${
                        shown && mark ? ` ${t[mark]}` : ""
                      }`}
                      className={`flex size-11 sm:size-12 items-center justify-center rounded-xl border-2 text-xl font-black transition-all ${
                        shown && mark
                          ? markClass[mark]
                          : letter
                          ? "border-primary/60 bg-muted/20 text-foreground scale-105"
                          : "border-border bg-muted/10 text-muted-foreground"
                      } ${
                        shown && isLatest && column === revealedCols - 1 && !reduced
                          ? "oiyo-wordle-flip"
                          : ""
                      }`}
                    >
                      {letter}
                      {shown && mark && (
                        <span className="ml-0.5 text-xs font-black" aria-hidden="true">
                          {markSymbol[mark]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Error Announcement */}
        <p
          id="wordle-error"
          className="min-h-5 text-xs font-bold text-destructive text-center"
          role="alert"
        >
          {error}
        </p>

        {/* Onscreen Virtual Keyboard */}
        <div className="flex w-full max-w-md flex-col gap-1.5" aria-label="Keyboard">
          {ROWS.map((row, i) => (
            <div key={i} className="flex w-full gap-1">
              {row.map((k) => {
                const mark = evidence[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => key(k)}
                    disabled={phase !== "play" || game.status !== "playing"}
                    aria-label={k === "⌫" ? "Backspace" : k}
                    className={`h-11 sm:h-12 min-w-0 rounded-lg border border-border text-xs font-black transition-colors ${
                      k.length > 1 ? "flex-[1.5]" : "flex-1"
                    } ${
                      mark
                        ? markClass[mark]
                        : "bg-muted/70 text-foreground hover:bg-muted active:bg-primary active:text-primary-foreground"
                    } disabled:opacity-50`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Daily Puzzle Archive Calendar Modal */}
      <DailyPuzzleCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        gameSlug="wordle"
        gameTitle={t.title}
        onSelectDate={(selectedDate) => {
          setDailyDate(selectedDate);
          const seed = wordleDateSeed(selectedDate);
          setGame(createWordle(seed, targets.length, "daily", selectedDate));
          guessCount.current = 0;
          startedAt.current = Date.now();
          setPhase("play");
        }}
      />
    </GameShell>
  );
}
