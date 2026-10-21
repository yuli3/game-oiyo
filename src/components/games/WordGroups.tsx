/**
 * 네 묶음 (Word Groups): sort 16 words into four hidden groups of four.
 * The daily puzzle is the same for everyone on a device-local calendar day.
 * Pure rules live in src/lib/games/word-groups.ts; this file owns UI and storage.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { minutesUntilNextDaily, todayKey } from "../../lib/games/daily";
import { getStreak, recordStreak, type StreakStats } from "../../lib/games/records";
import {
  WORD_GROUPS_ID,
  WORD_GROUPS_MAX_MISTAKES,
  WORD_GROUPS_SIZE,
  createWordGroups,
  parseWordGroups,
  remainingWords,
  serializeWordGroups,
  submitWordGroupsGuess,
  wordGroupsIndexForDate,
  wordGroupsDailyKey,
  wordGroupsShareText,
  wordGroupsTiles,
  type GroupLevel,
  type GuessResult,
  type WordGroupsPack,
  type WordGroupsPuzzle,
  type WordGroupsState,
} from "../../lib/games/word-groups";
import type { Locale } from "../../lib/i18n";
import { Spinner } from "../ui/spinner";

const COPY = {
  ko: {
    title: "네 묶음", lead: "16개 단어를 같은 주제끼리 4개씩 묶어 보세요. 실수는 4번까지예요.",
    loading: "오늘의 퍼즐을 불러오는 중…", fail: "퍼즐을 불러오지 못했어요.", daily: "오늘의 퍼즐", practice: "연습 퍼즐",
    shuffle: "섞기", clear: "선택 해제", submit: "제출", mistakes: "남은 실수",
    oneAway: "하나만 바꾸면 돼요!", miss: "같은 묶음이 아니에요.", repeat: "이미 낸 조합이에요.", solved: "정답!",
    won: "모두 찾았어요!", lost: "오늘은 여기까지. 정답을 확인하세요.", share: "결과 복사", copied: "복사했어요",
    again: "다른 연습 퍼즐", next: (m: number) => `다음 퍼즐까지 ${Math.floor(m / 60)}시간 ${m % 60}분`,
    streak: (s: StreakStats) => `연승 ${s.currentStreak}회 · 최고 ${s.maxStreak}회 · ${s.won}/${s.played}회 성공`,
    restored: "하던 퍼즐을 이어서 보여 드려요.", selected: (n: number) => `${n}/4 선택`, keys: "F 키로 전체 화면을 켜고 끌 수 있어요.",
    shareHead: (label: string) => `OIYO 네 묶음 ${label}`,
  },
  en: {
    title: "Four Groups", lead: "Sort 16 words into four groups of four that share a theme. You can make 4 mistakes.",
    loading: "Loading today's puzzle…", fail: "Could not load the puzzle.", daily: "Daily puzzle", practice: "Practice puzzle",
    shuffle: "Shuffle", clear: "Deselect", submit: "Submit", mistakes: "Mistakes left",
    oneAway: "One away!", miss: "Not a group.", repeat: "You already tried that.", solved: "Correct!",
    won: "You found them all!", lost: "That's it for today. Here are the groups.", share: "Copy result", copied: "Copied",
    again: "Another practice puzzle", next: (m: number) => `Next puzzle in ${Math.floor(m / 60)}h ${m % 60}m`,
    streak: (s: StreakStats) => `Win streak ${s.currentStreak} · Best ${s.maxStreak} · ${s.won}/${s.played} solved`,
    restored: "Picked up where you left off.", selected: (n: number) => `${n}/4 selected`, keys: "Press F to toggle full screen.",
    shareHead: (label: string) => `OIYO Four Groups ${label}`,
  },
  ja: {
    title: "四つのグループ", lead: "16個の言葉を、同じテーマの4つずつに分けましょう。ミスは4回までです。",
    loading: "今日のパズルを読み込み中…", fail: "パズルを読み込めませんでした。", daily: "今日のパズル", practice: "練習パズル",
    shuffle: "シャッフル", clear: "選択解除", submit: "決定", mistakes: "残りミス",
    oneAway: "あと一つ！", miss: "同じグループではありません。", repeat: "その組み合わせは試しました。", solved: "正解！",
    won: "全部見つけました！", lost: "今日はここまで。答えを確認しましょう。", share: "結果をコピー", copied: "コピーしました",
    again: "別の練習パズル", next: (m: number) => `次のパズルまで ${Math.floor(m / 60)}時間${m % 60}分`,
    streak: (s: StreakStats) => `${s.currentStreak}連勝 · 最高 ${s.maxStreak}連勝 · ${s.won}/${s.played}回クリア`,
    restored: "途中のパズルを再開しました。", selected: (n: number) => `${n}/4 選択`, keys: "Fキーで全画面を切り替えます。",
    shareHead: (label: string) => `OIYO 四つのグループ ${label}`,
  },
  zh: {
    title: "四组词", lead: "把16个词按相同主题分成四组，每组4个。最多可以失误4次。",
    loading: "正在加载今日谜题…", fail: "无法加载谜题。", daily: "今日谜题", practice: "练习谜题",
    shuffle: "打乱", clear: "取消选择", submit: "提交", mistakes: "剩余失误",
    oneAway: "只差一个！", miss: "不是同一组。", repeat: "这个组合已经试过了。", solved: "正确！",
    won: "全部找到了！", lost: "今天就到这里，看看答案吧。", share: "复制结果", copied: "已复制",
    again: "换一个练习谜题", next: (m: number) => `距下一题 ${Math.floor(m / 60)}小时${m % 60}分`,
    streak: (s: StreakStats) => `连胜 ${s.currentStreak}次 · 最佳 ${s.maxStreak}次 · 成功 ${s.won}/${s.played}次`,
    restored: "已恢复上次的进度。", selected: (n: number) => `已选 ${n}/4`, keys: "按 F 键切换全屏。",
    shareHead: (label: string) => `OIYO 四组词 ${label}`,
  },
  fr: {
    title: "Quatre groupes", lead: "Classez 16 mots en quatre groupes de quatre qui partagent un thème. Vous avez droit à 4 erreurs.",
    loading: "Chargement du puzzle du jour…", fail: "Impossible de charger le puzzle.", daily: "Puzzle du jour", practice: "Puzzle d'entraînement",
    shuffle: "Mélanger", clear: "Désélectionner", submit: "Valider", mistakes: "Erreurs restantes",
    oneAway: "Presque, un seul mot de trop !", miss: "Ce n'est pas un groupe.", repeat: "Combinaison déjà essayée.", solved: "Bravo !",
    won: "Vous avez tout trouvé !", lost: "C'est fini pour aujourd'hui. Voici les groupes.", share: "Copier le résultat", copied: "Copié",
    again: "Un autre puzzle d'entraînement", next: (m: number) => `Prochain puzzle dans ${Math.floor(m / 60)} h ${m % 60} min`,
    streak: (s: StreakStats) => `Victoires consécutives ${s.currentStreak} · Record ${s.maxStreak} · ${s.won}/${s.played} réussis`,
    restored: "Reprise de votre partie.", selected: (n: number) => `${n}/4 choisis`, keys: "Appuyez sur F pour le plein écran.",
    shareHead: (label: string) => `OIYO Quatre groupes ${label}`,
  },
  es: {
    title: "Cuatro grupos", lead: "Ordena 16 palabras en cuatro grupos de cuatro con un tema en común. Puedes fallar 4 veces.",
    loading: "Cargando el puzle del día…", fail: "No se pudo cargar el puzle.", daily: "Puzle del día", practice: "Puzle de práctica",
    shuffle: "Mezclar", clear: "Quitar selección", submit: "Enviar", mistakes: "Fallos restantes",
    oneAway: "¡Te falta una!", miss: "No es un grupo.", repeat: "Ya probaste esa combinación.", solved: "¡Correcto!",
    won: "¡Los encontraste todos!", lost: "Se acabó por hoy. Estos eran los grupos.", share: "Copiar resultado", copied: "Copiado",
    again: "Otro puzle de práctica", next: (m: number) => `Próximo puzle en ${Math.floor(m / 60)} h ${m % 60} min`,
    streak: (s: StreakStats) => `Victorias consecutivas ${s.currentStreak} · Mejor ${s.maxStreak} · ${s.won}/${s.played} resueltos`,
    restored: "Retomamos tu partida.", selected: (n: number) => `${n}/4 elegidas`, keys: "Pulsa F para pantalla completa.",
    shareHead: (label: string) => `OIYO Cuatro grupos ${label}`,
  },
} as const;

const LEVEL_CLASS: Record<GroupLevel, string> = {
  0: "bg-warning text-warning-foreground",
  1: "bg-success text-success-foreground",
  2: "bg-info text-info-foreground",
  3: "bg-chart-4 text-info-foreground",
};

const DAILY_KEY = "oiyo-word-groups-daily";

type Mode = "daily" | "practice";
type Feedback = Exclude<GuessResult, "invalid"> | null;

function readDailySave(dateKey: string, puzzle: WordGroupsPuzzle, locale: Locale) {
  try {
    // Preserve the legacy original; puzzle-id validation below prevents using
    // another language's legacy save while new writes stay language-scoped.
    const raw = JSON.parse(localStorage.getItem(wordGroupsDailyKey(locale)) ?? localStorage.getItem(DAILY_KEY) ?? "null") as { dateKey?: string; save?: string } | null;
    if (!raw || raw.dateKey !== dateKey) return null;
    return parseWordGroups(raw.save ?? null, puzzle);
  } catch {
    return null;
  }
}

function writeDailySave(dateKey: string, state: WordGroupsState, recorded: boolean, locale: Locale) {
  try {
    localStorage.setItem(wordGroupsDailyKey(locale), JSON.stringify({ dateKey, save: serializeWordGroups(state, recorded) }));
  } catch {
    // Storage can be full or blocked; the game still plays without it.
  }
}

export default function WordGroups({ locale = "ko" }: { locale?: Locale }) {
  const t = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });

  const [pack, setPack] = useState<WordGroupsPack | null>(null);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<Mode>("daily");
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [dateKey] = useState(() => todayKey());
  const [game, setGame] = useState<WordGroupsState | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [recorded, setRecorded] = useState(false);
  const [restored, setRestored] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [nextMinutes, setNextMinutes] = useState(() => minutesUntilNextDaily());

  const puzzle = pack?.puzzles[puzzleIndex] ?? null;

  const startPuzzle = useCallback((p: WordGroupsPuzzle, state: WordGroupsState) => {
    setGame(state);
    setOrder(wordGroupsTiles(p));
    setSelected([]);
    setFeedback(null);
    setCopied(false);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = (code: string) =>
      fetch(`/data/word-groups/${code}.json`).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<WordGroupsPack>;
      });
    load(locale)
      .catch(() => load("en"))
      .then((data) => {
        if (!alive) return;
        const index = wordGroupsIndexForDate(dateKey, data.puzzles.length);
        const daily = data.puzzles[index];
        const saved = readDailySave(dateKey, daily, locale);
        setPack(data);
        setPuzzleIndex(index);
        startPuzzle(daily, saved?.state ?? createWordGroups(daily));
        setRecorded(saved?.recorded ?? false);
        setRestored(Boolean(saved && saved.state.guesses.length > 0));
      })
      .catch(() => alive && setFailed(true));
    setStats(getStreak(WORD_GROUPS_ID));
    return () => {
      alive = false;
    };
  }, [locale, dateKey, startPuzzle]);

  useEffect(() => {
    const id = window.setInterval(() => setNextMinutes(minutesUntilNextDaily()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // WHY (2026-10-21): record each locale's daily result once after reload; the
  // shared record counts consecutive wins, not consecutive calendar days.
  useEffect(() => {
    if (mode !== "daily" || !game) return;
    let done = recorded;
    if (game.status !== "playing" && !recorded) {
      setStats(recordStreak(WORD_GROUPS_ID, game.status === "won"));
      setRecorded(true);
      done = true;
    }
    writeDailySave(dateKey, game, done, locale);
  }, [game, mode, recorded, dateKey, locale]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code === "KeyF") {
        event.preventDefault();
        togglePortal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePortal]);

  const board = useMemo(() => (puzzle && game ? remainingWords(puzzle, game, order) : []), [puzzle, game, order]);

  const toggle = (word: string) => {
    if (!game || game.status !== "playing") return;
    setFeedback(null);
    setRestored(false);
    setSelected((cur) => (cur.includes(word) ? cur.filter((w) => w !== word) : cur.length < WORD_GROUPS_SIZE ? [...cur, word] : cur));
  };

  const submit = () => {
    if (!puzzle || !game) return;
    const next = submitWordGroupsGuess(puzzle, game, selected);
    if (next.result === "invalid") return;
    setFeedback(next.result);
    setGame(next.state);
    if (next.result === "solved") setSelected([]);
  };

  const shuffleBoard = () => {
    if (!puzzle) return;
    setOrder(wordGroupsTiles(puzzle, (crypto.getRandomValues?.(new Uint32Array(1))[0] ?? Date.now()) >>> 0));
  };

  const playDaily = () => {
    if (!pack) return;
    const index = wordGroupsIndexForDate(dateKey, pack.puzzles.length);
    const daily = pack.puzzles[index];
    const saved = readDailySave(dateKey, daily, locale);
    setMode("daily");
    setPuzzleIndex(index);
    startPuzzle(daily, saved?.state ?? createWordGroups(daily));
    setRecorded(saved?.recorded ?? false);
    setRestored(false);
  };

  const playPractice = () => {
    if (!pack) return;
    const daily = wordGroupsIndexForDate(dateKey, pack.puzzles.length);
    const choices = pack.puzzles.map((_, i) => i).filter((i) => i !== daily && i !== puzzleIndex);
    const pool = choices.length ? choices : pack.puzzles.map((_, i) => i);
    const index = pool[Math.floor(Math.random() * pool.length)];
    setMode("practice");
    setPuzzleIndex(index);
    startPuzzle(pack.puzzles[index], createWordGroups(pack.puzzles[index]));
    setRestored(false);
  };

  const share = async () => {
    if (!puzzle || !game) return;
    const label = mode === "daily" ? dateKey : t.practice;
    try {
      await navigator.clipboard.writeText(wordGroupsShareText(puzzle, game, t.shareHead(label)));
      setCopied(true);
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  };

  if (failed) return <p role="alert" className="p-6 text-center font-bold text-destructive">{t.fail}</p>;
  if (!puzzle || !game) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3">
        <Spinner className="size-8" />
        <p>{t.loading}</p>
      </div>
    );
  }

  const solvedGroups = game.solved.map((level) => puzzle.groups.find((g) => g.level === level)!);
  const missedGroups = game.status === "lost" ? puzzle.groups.filter((g) => !game.solved.includes(g.level)) : [];
  const left = WORD_GROUPS_MAX_MISTAKES - game.mistakes;
  const message =
    restored ? t.restored
    : game.status === "won" ? t.won
    : game.status === "lost" ? t.lost
    : feedback === "one-away" ? t.oneAway
    : feedback === "miss" ? t.miss
    : feedback === "repeat" ? t.repeat
    : feedback === "solved" ? t.solved
    : t.selected(selected.length);

  return (
    <div
      ref={containerRef}
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto overscroll-none bg-background" : "w-full"}
    >
      <div className="not-prose mx-auto flex w-full max-w-lg flex-col gap-4 py-3">
        <header className="relative space-y-1 pr-12">
          <button
            type="button"
            onClick={togglePortal}
            className="absolute right-0 top-0 flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition hover:bg-muted"
            title={isImmersive ? portalLabels.exit : portalLabels.enter}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            aria-pressed={isImmersive}
          >
            {isImmersive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <h2 className="text-2xl font-black text-foreground">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.lead}</p>
          {stats && stats.played > 0 && <p className="text-xs font-bold text-foreground">{t.streak(stats)}</p>}
        </header>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={playDaily} aria-pressed={mode === "daily"} className={`min-h-11 rounded-xl border border-border px-4 text-sm font-bold ${mode === "daily" ? "bg-primary text-primary-foreground" : "bg-card"}`}>{t.daily}</button>
          <button type="button" onClick={playPractice} aria-pressed={mode === "practice"} className={`min-h-11 rounded-xl border border-border px-4 text-sm font-bold ${mode === "practice" ? "bg-primary text-primary-foreground" : "bg-card"}`}>{mode === "practice" ? t.again : t.practice}</button>
        </div>

        <div className="flex flex-col gap-2">
          {[...solvedGroups, ...missedGroups].map((group) => (
            <div
              key={group.level}
              className={`rounded-xl px-3 py-3 text-center ${LEVEL_CLASS[group.level]} ${missedGroups.includes(group) ? "opacity-70" : ""}`}
            >
              <p className="text-sm font-black uppercase">{group.theme}</p>
              <p className="text-sm">{group.words.join(" · ")}</p>
            </div>
          ))}
          {game.status === "playing" && (
            <div className="grid grid-cols-4 gap-2" role="group" aria-label={t.title}>
              {board.map((word) => {
                const on = selected.includes(word);
                return (
                  <button
                    key={word}
                    type="button"
                    onClick={() => toggle(word)}
                    aria-pressed={on}
                    className={`flex min-h-16 items-center justify-center break-keep rounded-xl border px-1 text-center text-sm font-bold leading-tight transition ${on ? "border-foreground bg-foreground text-background" : "border-border bg-muted text-foreground hover:bg-accent"}`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p role="status" aria-live="polite" className="min-h-5 text-center text-sm font-bold text-foreground">{message}</p>

        {game.status === "playing" ? (
          <>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>{t.mistakes}</span>
              <span className="flex gap-1" aria-label={`${t.mistakes} ${left}`}>
                {Array.from({ length: WORD_GROUPS_MAX_MISTAKES }, (_, i) => (
                  <span key={i} className={`size-3 rounded-full ${i < left ? "bg-foreground" : "bg-border"}`} />
                ))}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={shuffleBoard} className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-bold hover:bg-muted">{t.shuffle}</button>
              <button type="button" onClick={() => setSelected([])} disabled={selected.length === 0} className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-bold hover:bg-muted disabled:opacity-50">{t.clear}</button>
              <button type="button" onClick={submit} disabled={selected.length !== WORD_GROUPS_SIZE} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">{t.submit}</button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={share} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">{copied ? t.copied : t.share}</button>
            {mode === "daily" && <p className="text-xs font-bold text-muted-foreground">{t.next(nextMinutes)}</p>}
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">{t.keys}</p>
      </div>
    </div>
  );
}
