import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import {
  AJAE_KEYS,
  AJAE_MIN_LEN,
  ajaeLimitMs,
  ajaePatternLength,
  isAjaeClear,
  isAjaeKey,
  makeAjaePattern,
} from "../../lib/games/ajae-pattern";

/* ────────────────────────────────────────────────────────────────────────────
 * 아재패턴 연습 — QWERASDF key-sequence trainer for the Lost Ark "아재절단기"
 * mechanic. Ported from the ahoxy build that ranks ~3rd for 아재패턴 / 아재패턴
 * 연습; the mechanics are kept identical on purpose (8 keys, 4–8 length, a
 * 4s + 0.5s-per-extra-key limit) because those are what the ranking is built on.
 * Single-file game, all 6 locales inline — repo convention.
 * ────────────────────────────────────────────────────────────────────────── */

const KEYS = AJAE_KEYS;
const GAME_ID = "lostark-ajae-pattern";
const STATS_KEY = "oiyo:ajae-pattern-stats:v1";

type Stats = { plays: number; wins: number; streak: number; maxStreak: number; totalMs: number };
const emptyStats = (): Stats => ({ plays: 0, wins: 0, streak: 0, maxStreak: 0, totalMs: 0 });

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as Partial<Stats>;
    const merged = { ...emptyStats(), ...parsed };
    // A corrupted or hand-edited store should not poison the display.
    return Object.values(merged).every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)
      ? merged
      : emptyStats();
  } catch {
    return emptyStats();
  }
}

interface I18n {
  eyebrow: string;
  lead: string;
  start: string;
  stop: string;
  again: string;
  idle: string;
  go: string;
  timeout: string;
  wrong: (key: string) => string;
  success: (ms: number) => string;
  level: (len: number, sec: string) => string;
  accuracy: string;
  streak: string;
  average: string;
  best: string;
  reset: string;
  keyAria: (i: number, key: string, done: boolean) => string;
  howTitle: string;
  how: string[];
  whyTitle: string;
  why: string;
}

const T: Record<Locale, I18n> = {
  ko: {
    eyebrow: "로스트아크 아재패턴 연습",
    lead: "QWERASDF 8개 키로 아재패턴을 연습합니다. 4~8키 랜덤 패턴과 제한시간, 연승과 최고기록이 브라우저에만 저장됩니다.",
    start: "시작하기",
    stop: "그만하기",
    again: "다시 시작",
    idle: "시작을 누르면 패턴이 나옵니다.",
    go: "패턴을 순서대로 입력하세요.",
    timeout: "시간 초과! 새 패턴으로 다시 갑니다.",
    wrong: (key) => `${key} 키가 아닙니다. 새 패턴으로 다시 갑니다.`,
    success: (ms) => `성공! ${ms}ms · 다음 패턴을 준비합니다.`,
    level: (len, sec) => `${len}키 · ${sec}초`,
    accuracy: "성공률",
    streak: "연승 / 최고",
    average: "평균 기록",
    best: "최고 기록",
    reset: "기록 지우기",
    keyAria: (i, key, done) => `${i}번째 키 ${key}${done ? ", 입력 완료" : ""}`,
    howTitle: "연습 방법",
    how: [
      "시작을 누르면 4~8개의 키가 순서대로 나타납니다.",
      "제한시간 안에 왼손 QWERASDF 위치 그대로 순서대로 누릅니다.",
      "한 글자라도 틀리면 그 판은 실패하고 새 패턴이 나옵니다.",
      "모바일에서는 화면 아래 키를 눌러도 됩니다.",
    ],
    whyTitle: "왜 손이 먼저 기억해야 하나",
    why: "실전에서는 패턴을 눈으로 읽고 손가락 위치를 찾을 시간이 없습니다. 키 배열을 손이 기억하면 화면을 보는 시간이 그대로 여유가 됩니다.",
  },
  en: {
    eyebrow: "Lost Ark 아재패턴 (Ajae pattern) trainer",
    lead: "Practise the Lost Ark key-sequence mechanic on QWERASDF. Random 4–8 key patterns on a timer; streaks and best times stay in your browser.",
    start: "Start",
    stop: "Stop",
    again: "Play again",
    idle: "Press start to get a pattern.",
    go: "Type the pattern in order.",
    timeout: "Out of time — here comes a new pattern.",
    wrong: (key) => `That was not ${key}. Here comes a new pattern.`,
    success: (ms) => `Clear! ${ms}ms — next pattern coming up.`,
    level: (len, sec) => `${len} keys · ${sec}s`,
    accuracy: "Success rate",
    streak: "Streak / best",
    average: "Average",
    best: "Best time",
    reset: "Clear records",
    keyAria: (i, key, done) => `Key ${i}: ${key}${done ? ", entered" : ""}`,
    howTitle: "How to practise",
    how: [
      "Press start and 4–8 keys appear in order.",
      "Type them in order on QWERASDF before the timer runs out.",
      "One wrong key ends the round and a new pattern appears.",
      "On mobile, tap the on-screen keys instead.",
    ],
    whyTitle: "Why your hands should know it",
    why: "In a real run there is no time to read the pattern and then hunt for the keys. Once your fingers know the layout, the time you used for looking becomes headroom.",
  },
  ja: {
    eyebrow: "ロストアーク アジェパターン練習",
    lead: "QWERASDFの8キーでキーシーケンス機構を練習します。4〜8キーのランダムパターンと制限時間、連勝と最高記録はブラウザにのみ保存されます。",
    start: "スタート",
    stop: "やめる",
    again: "もう一度",
    idle: "スタートを押すとパターンが出ます。",
    go: "順番どおりに入力してください。",
    timeout: "時間切れ！新しいパターンに進みます。",
    wrong: (key) => `${key} ではありません。新しいパターンに進みます。`,
    success: (ms) => `成功！${ms}ms · 次のパターンを準備します。`,
    level: (len, sec) => `${len}キー · ${sec}秒`,
    accuracy: "成功率",
    streak: "連勝 / 最高",
    average: "平均記録",
    best: "最高記録",
    reset: "記録を消す",
    keyAria: (i, key, done) => `${i}番目のキー ${key}${done ? "、入力済み" : ""}`,
    howTitle: "練習の手順",
    how: [
      "スタートを押すと4〜8個のキーが順番に表示されます。",
      "制限時間内にQWERASDFの位置のまま順番に押します。",
      "一つでも間違えるとそのラウンドは失敗し、新しいパターンが出ます。",
      "モバイルでは画面下のキーをタップしても構いません。",
    ],
    whyTitle: "手が先に覚えるべき理由",
    why: "実戦ではパターンを目で読んでから指の位置を探す時間はありません。配列を手が覚えれば、画面を見ていた時間がそのまま余裕になります。",
  },
  zh: {
    eyebrow: "命运方舟 按键序列练习",
    lead: "用 QWERASDF 八个键练习按键序列机制。4–8 键随机图案与限时，连胜和最佳记录只保存在浏览器中。",
    start: "开始",
    stop: "停止",
    again: "再来一次",
    idle: "按开始即可获得图案。",
    go: "请按顺序输入。",
    timeout: "超时！换一个新图案。",
    wrong: (key) => `不是 ${key}。换一个新图案。`,
    success: (ms) => `成功！${ms}ms · 准备下一个图案。`,
    level: (len, sec) => `${len} 键 · ${sec} 秒`,
    accuracy: "成功率",
    streak: "连胜 / 最高",
    average: "平均成绩",
    best: "最佳成绩",
    reset: "清除记录",
    keyAria: (i, key, done) => `第 ${i} 个键 ${key}${done ? "，已输入" : ""}`,
    howTitle: "练习方法",
    how: [
      "按开始后会依次出现 4–8 个键。",
      "在限时内按 QWERASDF 的位置依次按下。",
      "错一个键该回合即失败，并出现新图案。",
      "手机上可以点击屏幕下方的按键。",
    ],
    whyTitle: "为什么要让手先记住",
    why: "实战中没有时间先看图案再找按键位置。手记住键位后，原本用来看屏幕的时间就变成了余裕。",
  },
  fr: {
    eyebrow: "Entraîneur de séquence Lost Ark",
    lead: "Entraînez la mécanique de séquence de touches sur QWERASDF. Motifs aléatoires de 4 à 8 touches chronométrés ; séries et records restent dans votre navigateur.",
    start: "Démarrer",
    stop: "Arrêter",
    again: "Rejouer",
    idle: "Appuyez sur démarrer pour obtenir un motif.",
    go: "Tapez le motif dans l'ordre.",
    timeout: "Temps écoulé — nouveau motif.",
    wrong: (key) => `Ce n'était pas ${key}. Nouveau motif.`,
    success: (ms) => `Réussi ! ${ms}ms — motif suivant.`,
    level: (len, sec) => `${len} touches · ${sec}s`,
    accuracy: "Taux de réussite",
    streak: "Série / record",
    average: "Moyenne",
    best: "Meilleur temps",
    reset: "Effacer les records",
    keyAria: (i, key, done) => `Touche ${i} : ${key}${done ? ", saisie" : ""}`,
    howTitle: "Comment s'entraîner",
    how: [
      "Appuyez sur démarrer : 4 à 8 touches apparaissent dans l'ordre.",
      "Tapez-les dans l'ordre sur QWERASDF avant la fin du chrono.",
      "Une seule erreur termine la manche et un nouveau motif apparaît.",
      "Sur mobile, touchez les touches affichées à l'écran.",
    ],
    whyTitle: "Pourquoi les mains doivent savoir",
    why: "En situation réelle, pas le temps de lire le motif puis de chercher les touches. Quand les doigts connaissent la disposition, le temps passé à regarder devient de la marge.",
  },
  es: {
    eyebrow: "Entrenador de secuencia de Lost Ark",
    lead: "Practica la mecánica de secuencia de teclas en QWERASDF. Patrones aleatorios de 4 a 8 teclas con tiempo límite; rachas y récords se quedan en tu navegador.",
    start: "Empezar",
    stop: "Parar",
    again: "Jugar otra vez",
    idle: "Pulsa empezar para obtener un patrón.",
    go: "Escribe el patrón en orden.",
    timeout: "Se acabó el tiempo: llega un patrón nuevo.",
    wrong: (key) => `Esa no era ${key}. Llega un patrón nuevo.`,
    success: (ms) => `¡Completado! ${ms}ms — siguiente patrón.`,
    level: (len, sec) => `${len} teclas · ${sec}s`,
    accuracy: "Tasa de acierto",
    streak: "Racha / mejor",
    average: "Media",
    best: "Mejor tiempo",
    reset: "Borrar récords",
    keyAria: (i, key, done) => `Tecla ${i}: ${key}${done ? ", introducida" : ""}`,
    howTitle: "Cómo practicar",
    how: [
      "Pulsa empezar y aparecerán de 4 a 8 teclas en orden.",
      "Escríbelas en orden en QWERASDF antes de que acabe el tiempo.",
      "Una tecla equivocada termina la ronda y aparece un patrón nuevo.",
      "En móvil, toca las teclas de la pantalla.",
    ],
    whyTitle: "Por qué deben saberlo las manos",
    why: "En una partida real no hay tiempo para leer el patrón y luego buscar las teclas. Cuando los dedos conocen la distribución, el tiempo que usabas mirando se convierte en margen.",
  },
};

type Tone = "" | "good" | "bad";

const AjaePattern: React.FC<{ locale: Locale }> = ({ locale }) => {
  const t = T[locale] ?? T.en;

  const [pattern, setPattern] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState(t.idle);
  const [tone, setTone] = useState<Tone>("");
  const [levelLabel, setLevelLabel] = useState("");
  const [remaining, setRemaining] = useState(1);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [bestMs, setBestMs] = useState<number | null>(null);

  const startedAt = useRef(0);
  const deadline = useRef(0);
  const patternLen = useRef(AJAE_MIN_LEN);
  const frame = useRef(0);
  const nextRound = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arena = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setStats(loadStats());
    const stored = getBest(GAME_ID);
    if (stored?.unit === "seconds") setBestMs(Math.round(stored.value * 1000));
  }, []);

  const persist = useCallback((next: Stats) => {
    setStats(next);
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(next));
    } catch {
      /* private mode — the round still counts for this session */
    }
  }, []);

  const clearTimers = useCallback(() => {
    cancelAnimationFrame(frame.current);
    if (nextRound.current) clearTimeout(nextRound.current);
    nextRound.current = null;
  }, []);

  const beginRound = useCallback(() => {
    clearTimers();
    const length = ajaePatternLength();
    const limit = ajaeLimitMs(length);
    setPattern(makeAjaePattern(length));
    setCursor(0);
    setActive(true);
    setMessage(t.go);
    setTone("");
    setLevelLabel(t.level(length, (limit / 1000).toFixed(1)));
    setRemaining(1);
    startedAt.current = performance.now();
    deadline.current = startedAt.current + limit;
    patternLen.current = length;
    arena.current?.focus({ preventScroll: true });

    const tick = (now: number) => {
      const total = deadline.current - startedAt.current;
      const left = Math.max(0, deadline.current - now);
      setRemaining(left / total);
      if (left <= 0) {
        setActive(false);
        setMessage(t.timeout);
        setTone("bad");
        persist({ ...loadStats(), plays: loadStats().plays + 1, streak: 0 });
        nextRound.current = setTimeout(() => beginRound(), 1100);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [clearTimers, persist, t]);

  const stop = useCallback(() => {
    clearTimers();
    setActive(false);
    setPattern([]);
    setCursor(0);
    setMessage(t.idle);
    setTone("");
    setLevelLabel("");
  }, [clearTimers, t]);

  const press = useCallback(
    (key: string) => {
      if (!active) return;
      if (key !== pattern[cursor]) {
        clearTimers();
        setActive(false);
        setMessage(t.wrong(pattern[cursor]));
        setTone("bad");
        const cur = loadStats();
        persist({ ...cur, plays: cur.plays + 1, streak: 0 });
        nextRound.current = setTimeout(() => beginRound(), 1100);
        return;
      }
      const next = cursor + 1;
      setCursor(next);
      if (next < pattern.length) return;

      clearTimers();
      setActive(false);
      const elapsed = Math.round(performance.now() - startedAt.current);

      // requestAnimationFrame stops in a backgrounded tab, so the countdown can
      // be frozen while the clock kept running. Judge the round on elapsed time
      // rather than on whether the timer got a chance to fire.
      if (!isAjaeClear(elapsed, patternLen.current)) {
        const cur = loadStats();
        persist({ ...cur, plays: cur.plays + 1, streak: 0 });
        setMessage(t.timeout);
        setTone("bad");
        nextRound.current = setTimeout(() => beginRound(), 1100);
        return;
      }

      const cur = loadStats();
      const streak = cur.streak + 1;
      persist({
        plays: cur.plays + 1,
        wins: cur.wins + 1,
        streak,
        maxStreak: Math.max(cur.maxStreak, streak),
        totalMs: cur.totalMs + elapsed,
      });
      recordBest(GAME_ID, elapsed / 1000, "seconds");
      setBestMs((prev) => (prev === null ? elapsed : Math.min(prev, elapsed)));
      setMessage(t.success(elapsed));
      setTone("good");
      nextRound.current = setTimeout(() => beginRound(), 1100);
    },
    [active, beginRound, clearTimers, cursor, pattern, persist, t],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if (!isAjaeKey(key)) return;
      event.preventDefault();
      press(key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  useEffect(() => clearTimers, [clearTimers]);

  const reset = () => {
    persist(emptyStats());
    setBestMs(null);
    try {
      localStorage.removeItem(STATS_KEY);
    } catch {
      /* nothing to clear */
    }
  };

  const accuracy = stats.plays ? `${Math.round((stats.wins / stats.plays) * 100)}%` : "—";
  const average = stats.wins ? `${Math.round(stats.totalMs / stats.wins)}ms` : "—";

  return (
    <div className="not-prose flex flex-col gap-6">
      <div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-primary">{t.eyebrow}</p>
        <p className="text-muted-foreground leading-relaxed">{t.lead}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <strong aria-live="polite" data-tone={tone} className={tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : ""}>
            {message}
          </strong>
          <span className="text-sm text-muted-foreground">{levelLabel}</span>
        </div>

        <div
          ref={arena}
          tabIndex={-1}
          className="grid content-center gap-6 px-5 py-9 text-center outline-none"
          style={{ minHeight: "22rem" }}
        >
          <div className="flex min-h-[4.5rem] flex-wrap justify-center gap-2 sm:gap-3">
            {pattern.map((key, index) => (
              <span
                key={`${index}-${key}`}
                aria-label={t.keyAria(index + 1, key, index < cursor)}
                className={`grid h-14 w-12 place-items-center rounded-xl border border-b-4 text-2xl font-black sm:h-[4.5rem] sm:w-16 ${
                  index < cursor
                    ? "translate-y-[3px] border-b-2 border-success bg-success/15 text-success"
                    : "bg-muted"
                }`}
              >
                {key}
              </span>
            ))}
          </div>

          <div className="mx-auto h-2 w-full max-w-xl overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full origin-left bg-primary transition-none"
              style={{ transform: `scaleX(${active ? remaining : 0})` }}
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {!active && (
              <button type="button" onClick={beginRound} className="min-h-11 rounded-full bg-primary px-6 font-black text-primary-foreground">
                {pattern.length ? t.again : t.start}
              </button>
            )}
            {active && (
              <button type="button" onClick={stop} className="min-h-11 rounded-full border px-6 font-black">
                {t.stop}
              </button>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                aria-label={key}
                className="h-12 w-12 rounded-lg border font-black"
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-t bg-border sm:grid-cols-4">
          {[
            { label: t.accuracy, value: accuracy },
            { label: t.streak, value: `${stats.streak} / ${stats.maxStreak}` },
            { label: t.average, value: average },
            { label: t.best, value: bestMs ? `${bestMs}ms` : "—" },
          ].map((cell) => (
            <div key={cell.label} className="bg-card px-3 py-4 text-center">
              <span className="text-xs text-muted-foreground">{cell.label}</span>
              <strong className="mt-1 block text-xl">{cell.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border p-5">
          <h2 className="mb-3 text-lg font-bold">{t.howTitle}</h2>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            {t.how.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </section>
        <section className="rounded-xl border p-5">
          <h2 className="mb-3 text-lg font-bold">{t.whyTitle}</h2>
          <p className="leading-relaxed text-muted-foreground">{t.why}</p>
        </section>
      </div>

      <button type="button" onClick={reset} className="self-start text-sm text-muted-foreground underline">
        {t.reset}
      </button>
    </div>
  );
};

export default AjaePattern;
