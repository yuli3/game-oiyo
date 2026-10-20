// Daily four-group board. The shell stays scrollable: data-game-surface would
// set touch-action:none and block the word grid on a phone (2026-10-20).

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  getBestForConditions,
  getRecord,
  recordBestForConditions,
  recordResult,
  type ConditionalBestRecord,
  type GameRecord,
} from "../../lib/games/records";
import { kstDateKey } from "../../lib/games/todays-game";
import {
  GAME_ID,
  MISTAKE_LIMIT,
  dailyBestConditions,
  matchGroup,
  puzzleForDate,
  shareGrid,
  tileOrder,
  type WordGroup,
} from "../../lib/games/word-groups";

const LEVEL_CLASS = [
  "border-chart-1 bg-chart-1 text-primary-foreground",
  "border-chart-2 bg-chart-2 text-primary-foreground",
  "border-chart-3 bg-chart-3 text-primary-foreground",
  "border-chart-4 bg-chart-4 text-primary-foreground",
] as const;

const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  submit: string;
  clear: string;
  replay: string;
  mistakes: string;
  left: (n: number) => string;
  win: string;
  loss: string;
  share: string;
  copied: string;
  copyFailed: string;
  record: (wins: number, losses: number) => string;
  best: (n: number) => string;
  selectFour: string;
  solved: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "네 묶음",
    subtitle: "같은 주제 넷을 고르세요. 실수는 네 번까지입니다.",
    preparing: "판을 준비하는 중입니다.",
    submit: "묶기",
    clear: "선택 취소",
    replay: "같은 판 다시",
    mistakes: "실수",
    left: (n) => `남은 실수 ${n}`,
    win: "네 묶음을 모두 찾았습니다.",
    loss: "실수가 네 번입니다. 남은 묶음을 엽니다.",
    share: "결과 복사",
    copied: "결과를 복사했습니다.",
    copyFailed: "복사하지 못했습니다.",
    record: (wins, losses) => `승 ${wins} · 패 ${losses}`,
    best: (n) => `오늘 최고 ${n}`,
    selectFour: "네 단어를 고른 뒤 묶으세요.",
    solved: "찾은 묶음",
  },
  en: {
    title: "Four Groups",
    subtitle: "Find four words that share one theme. Four mistakes end the board.",
    preparing: "Preparing today's board.",
    submit: "Group",
    clear: "Clear",
    replay: "Same board",
    mistakes: "Mistakes",
    left: (n) => `${n} mistakes left`,
    win: "All four groups are found.",
    loss: "Four mistakes. The remaining groups are open.",
    share: "Copy result",
    copied: "Result copied.",
    copyFailed: "Could not copy.",
    record: (wins, losses) => `${wins} wins · ${losses} losses`,
    best: (n) => `Today's best ${n}`,
    selectFour: "Choose four words, then group them.",
    solved: "Found",
  },
  ja: {
    title: "四つの組",
    subtitle: "同じ題の四語を選んでください。まちがいは四回までです。",
    preparing: "今日の盤を準備しています。",
    submit: "そろえる",
    clear: "選択を消す",
    replay: "同じ盤",
    mistakes: "まちがい",
    left: (n) => `残り ${n}`,
    win: "四つの組を見つけました。",
    loss: "まちがいが四回です。残りの組を開きます。",
    share: "結果をコピー",
    copied: "結果をコピーしました。",
    copyFailed: "コピーできませんでした。",
    record: (wins, losses) => `勝 ${wins} · 負 ${losses}`,
    best: (n) => `今日の最高 ${n}`,
    selectFour: "四語を選んでからそろえます。",
    solved: "見つかった組",
  },
  zh: {
    title: "四组词",
    subtitle: "找出同一主题的四个词。错误四次就结束。",
    preparing: "正在准备今天的题。",
    submit: "成组",
    clear: "取消选择",
    replay: "同一题",
    mistakes: "错误",
    left: (n) => `还可错 ${n} 次`,
    win: "四组都找到了。",
    loss: "已经错了四次。剩下的组打开了。",
    share: "复制结果",
    copied: "已复制结果。",
    copyFailed: "没能复制。",
    record: (wins, losses) => `胜 ${wins} · 负 ${losses}`,
    best: (n) => `今日最高 ${n}`,
    selectFour: "先选四个词，再成组。",
    solved: "已找到",
  },
  fr: {
    title: "Quatre groupes",
    subtitle: "Trouvez quatre mots d'un même thème. Quatre erreurs ferment la grille.",
    preparing: "Préparation de la grille du jour.",
    submit: "Grouper",
    clear: "Effacer",
    replay: "Même grille",
    mistakes: "Erreurs",
    left: (n) => `${n} erreurs restantes`,
    win: "Les quatre groupes sont trouvés.",
    loss: "Quatre erreurs. Les groupes restants sont ouverts.",
    share: "Copier le résultat",
    copied: "Résultat copié.",
    copyFailed: "Copie impossible.",
    record: (wins, losses) => `${wins} victoires · ${losses} défaites`,
    best: (n) => `Meilleur du jour ${n}`,
    selectFour: "Choisissez quatre mots, puis groupez-les.",
    solved: "Trouvés",
  },
  es: {
    title: "Cuatro grupos",
    subtitle: "Encuentra cuatro palabras de un tema. Cuatro errores cierran el tablero.",
    preparing: "Preparando el tablero de hoy.",
    submit: "Agrupar",
    clear: "Quitar selección",
    replay: "El mismo tablero",
    mistakes: "Errores",
    left: (n) => `Quedan ${n}`,
    win: "Los cuatro grupos están encontrados.",
    loss: "Cuatro errores. Los grupos restantes quedan abiertos.",
    share: "Copiar resultado",
    copied: "Resultado copiado.",
    copyFailed: "No se pudo copiar.",
    record: (wins, losses) => `${wins} victorias · ${losses} derrotas`,
    best: (n) => `Mejor de hoy ${n}`,
    selectFour: "Elige cuatro palabras y agrúpalas.",
    solved: "Encontrados",
  },
};

interface FoundGroup {
  id: string;
  name: string;
  words: readonly string[];
  level: number;
}

interface Board {
  dateKey: string;
  round: number;
  tiles: string[];
  found: FoundGroup[];
  mistakes: number;
  status: "playing" | "won" | "lost";
}

function deal(locale: Locale, dateKey: string, round: number): Board {
  const puzzle = puzzleForDate(locale, dateKey);
  return { dateKey, round, tiles: tileOrder(puzzle, dateKey), found: [], mistakes: 0, status: "playing" };
}

export default function WordGroups({ locale }: { locale: Locale }) {
  const loc: Locale = locale in COPY ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [board, setBoard] = useState<Board | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<"copied" | "copyFailed" | "needFour" | null>(null);
  const [muted, setMuted] = useState(false);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [best, setBest] = useState<ConditionalBestRecord | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const recorded = useRef<string | null>(null);

  useEffect(() => {
    const dateKey = kstDateKey();
    setBoard(deal(loc, dateKey, 0));
    try {
      setRecord(getRecord(GAME_ID));
      setBest(getBestForConditions(GAME_ID, dailyBestConditions(dateKey)));
    } catch { /* storage can be blocked */ }
  }, [loc]);

  useEffect(() => {
    if (!board || board.status === "playing") return;
    const key = `${board.dateKey}:${board.round}`;
    if (recorded.current === key) return;
    recorded.current = key;
    const outcome = board.status === "won" ? "w" : "l";
    try { setRecord(recordResult(GAME_ID, outcome)); } catch { /* best-effort */ }
    if (outcome === "w") {
      try {
        setBest(recordBestForConditions(GAME_ID, MISTAKE_LIMIT - board.mistakes, "score", dailyBestConditions(board.dateKey)));
      } catch { /* best-effort */ }
    }
  }, [board]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        togglePortal();
      } else if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setMuted((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, togglePortal]);

  const beep = (ok: boolean) => {
    if (muted || reducedMotion) return;
    const Context = window.AudioContext;
    if (!Context) return;
    if (!audio.current) audio.current = new Context();
    const ctx = audio.current;
    void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 660 : 220;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  };

  const toggleWord = (word: string) => {
    if (!board || board.status !== "playing") return;
    setNotice(null);
    setSelected((current) => {
      if (current.includes(word)) return current.filter((item) => item !== word);
      if (current.length >= 4) return current;
      return [...current, word];
    });
  };

  const submit = () => {
    if (!board || board.status !== "playing") return;
    if (selected.length !== 4) {
      setNotice("needFour");
      return;
    }
    const puzzle = puzzleForDate(loc, board.dateKey);
    const group = matchGroup(puzzle, selected);
    if (group) {
      const found = [...board.found, group];
      const used = new Set(group.words);
      const tiles = board.tiles.filter((word) => !used.has(word));
      setBoard({ ...board, found, tiles, status: found.length === 4 ? "won" : "playing" });
      setSelected([]);
      beep(true);
      return;
    }
    const mistakes = board.mistakes + 1;
    setBoard({ ...board, mistakes, status: mistakes >= MISTAKE_LIMIT ? "lost" : "playing" });
    setSelected([]);
    beep(false);
  };

  const replay = () => {
    if (!board) return;
    setSelected([]);
    setNotice(null);
    setBoard(deal(loc, board.dateKey, board.round + 1));
  };

  const share = async () => {
    if (!board) return;
    const text = shareGrid(t.title, board.dateKey, board.found.map((group) => group.level), board.mistakes, t.mistakes);
    try {
      await navigator.clipboard.writeText(text);
      setNotice("copied");
    } catch {
      setNotice("copyFailed");
    }
  };

  const puzzle = board ? puzzleForDate(loc, board.dateKey) : null;
  const revealed: WordGroup[] = board && puzzle && board.status === "lost"
    ? puzzle.groups.filter((group) => !board.found.some((found) => found.id === group.id))
    : [];
  const shareText = board
    ? shareGrid(t.title, board.dateKey, board.found.map((group) => group.level), board.mistakes, t.mistakes)
    : "";
  const message = notice === "copied" ? t.copied : notice === "copyFailed" ? t.copyFailed : notice === "needFour" ? t.selectFour : board?.status === "won" ? t.win : board?.status === "lost" ? t.loss : null;

  return (
    <div
      ref={containerRef}
      className={
        isImmersive
          ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5"
          : "relative"
      }
    >
      <GameContainer title={t.title} subtitle={board ? board.dateKey : t.preparing}>
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? portalLabels.unmute : portalLabels.mute} title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button type="button" onClick={togglePortal} aria-pressed={isImmersive} aria-label={isImmersive ? portalLabels.exit : portalLabels.enter} title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>
        {!board || !puzzle ? <p className="text-sm text-muted-foreground">{t.preparing}</p> : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            <p className="text-sm font-bold text-foreground" aria-live="polite">{t.left(MISTAKE_LIMIT - board.mistakes)}</p>
            <div className="flex gap-2" aria-label={t.mistakes}>
              {Array.from({ length: MISTAKE_LIMIT }, (_, index) => (
                <span key={index} className={`size-3 rounded-full ${index < board.mistakes ? "bg-destructive" : "bg-muted"}`} />
              ))}
            </div>
            <div className="space-y-2" aria-label={t.solved}>
              {board.found.map((group) => (
                <div key={group.id} className={`rounded-xl border px-3 py-2 ${LEVEL_CLASS[group.level]}`}>
                  <p className="text-xs font-bold">{group.name}</p>
                  <p className="text-sm">{group.words.join(" · ")}</p>
                </div>
              ))}
              {revealed.map((group) => (
                <div key={group.id} className={`rounded-xl border px-3 py-2 ${LEVEL_CLASS[group.level]}`}>
                  <p className="text-xs font-bold">{group.name}</p>
                  <p className="text-sm">{group.words.join(" · ")}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {board.tiles.map((word) => {
                const on = selected.includes(word);
                return (
                  <button
                    key={word}
                    type="button"
                    disabled={board.status !== "playing"}
                    aria-pressed={on}
                    onClick={() => toggleWord(word)}
                    className={`${CONTROL} h-auto px-1 text-xs leading-tight break-words ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground"}`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={submit} disabled={board.status !== "playing"} className={`${CONTROL} border-primary bg-primary text-primary-foreground disabled:opacity-50`}>{t.submit}</button>
              <button type="button" onClick={() => setSelected([])} disabled={board.status !== "playing"} className={`${CONTROL} border-border bg-card text-foreground disabled:opacity-50`}>{t.clear}</button>
              {board.status !== "playing" && (
                <>
                  <button type="button" onClick={replay} className={`${CONTROL} border-border bg-card text-foreground`}>{t.replay}</button>
                  <button type="button" onClick={() => void share()} className={`${CONTROL} border-border bg-card text-foreground`}>{t.share}</button>
                </>
              )}
            </div>
            {message && <p className="text-sm text-foreground" role="status">{message}</p>}
            {board.status !== "playing" && <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-border bg-muted p-3 text-sm text-foreground">{shareText}</pre>}
            {record && <p className="text-sm text-muted-foreground">{t.record(record.w, record.l)}</p>}
            {best && <p className="text-sm text-muted-foreground">{t.best(best.value)}</p>}
          </div>
        )}
      </GameContainer>
    </div>
  );
}
