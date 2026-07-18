import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  dailyPuzzleId,
  orderGuesses,
  scoreGuess,
  type Guess,
  type ProximityBand,
  type SimilarityTable,
} from "../../lib/games/korean-semantle";
import { getStreak, recordStreak, type StreakStats } from "../../lib/games/records";

type UILocale = "ko" | "en" | "ja" | "zh" | "fr" | "es";
type Status = "loading" | "playing" | "won" | "revealed" | "error";

const DATA_BASE = "/data/korean-semantle";
const GAME_ID = "korean-semantle";

// ─── Band presentation ─────────────────────────────────────────────────────────
// Temperature palette — games keep their own vivid surface (not the olive tool
// tokens). Order coldest→hottest matches ProximityBand.
const BAND_STYLE: Record<ProximityBand, { bar: string; dot: string }> = {
  secret: { bar: "bg-emerald-500", dot: "bg-emerald-500" },
  burning: { bar: "bg-red-500", dot: "bg-red-500" },
  hot: { bar: "bg-orange-500", dot: "bg-orange-500" },
  warm: { bar: "bg-amber-500", dot: "bg-amber-400" },
  tepid: { bar: "bg-lime-500", dot: "bg-lime-500" },
  cold: { bar: "bg-sky-500", dot: "bg-sky-500" },
  freezing: { bar: "bg-slate-400", dot: "bg-slate-400" },
};

const BAND_LABEL: Record<UILocale, Record<ProximityBand, string>> = {
  ko: { secret: "정답!", burning: "매우 뜨거움", hot: "뜨거움", warm: "따뜻함", tepid: "미지근", cold: "차가움", freezing: "얼음" },
  en: { secret: "Solved!", burning: "Scorching", hot: "Hot", warm: "Warm", tepid: "Tepid", cold: "Cold", freezing: "Freezing" },
  ja: { secret: "正解！", burning: "灼熱", hot: "熱い", warm: "暖かい", tepid: "ぬるい", cold: "冷たい", freezing: "極寒" },
  zh: { secret: "答对了！", burning: "滚烫", hot: "热", warm: "温暖", tepid: "微温", cold: "冷", freezing: "冰冻" },
  fr: { secret: "Trouvé !", burning: "Brûlant", hot: "Chaud", warm: "Tiède+", tepid: "Tiède", cold: "Froid", freezing: "Glacial" },
  es: { secret: "¡Resuelto!", burning: "Ardiente", hot: "Caliente", warm: "Cálido", tepid: "Tibio", cold: "Frío", freezing: "Helado" },
};

// ─── Copy ──────────────────────────────────────────────────────────────────────
const COPY: Record<UILocale, {
  subtitle: string;
  placeholder: string;
  submit: string;
  loading: string;
  loadFail: string;
  notHangul: string;
  duplicate: string;
  unknown: string;
  guessCount: (n: number) => string;
  closest: string;
  rankLabel: string;
  won: (n: number) => string;
  reveal: string;
  revealed: (w: string) => string;
  playAgain: string;
  share: string;
  copied: string;
  demoBadge: string;
  demoCredit: string;
  credit: string;
  stats: (s: StreakStats) => string;
  hint: string;
}> = {
  ko: {
    subtitle: "숨은 단어와 의미가 가까운 단어를 추측하세요",
    placeholder: "단어 입력",
    submit: "추측",
    loading: "퍼즐 불러오는 중…",
    loadFail: "퍼즐을 불러오지 못했습니다.",
    notHangul: "한글 단어만 입력하세요",
    duplicate: "이미 추측한 단어입니다",
    unknown: "순위권 밖 (상위 목록에 없음)",
    guessCount: (n) => `${n}번째 추측`,
    closest: "가장 가까운 단어",
    rankLabel: "순위",
    won: (n) => `🎉 ${n}번 만에 맞혔어요!`,
    reveal: "포기하고 정답 보기",
    revealed: (w) => `정답은 "${w}" 였습니다.`,
    playAgain: "다시 하기",
    share: "결과 공유",
    copied: "복사됨!",
    demoBadge: "데모 퍼즐",
    demoCredit: "수작업으로 만든 예시 유사도 표입니다. fastText 데이터가 아닙니다.",
    credit: "단어 벡터: fastText Korean (Facebook AI Research), CC BY-SA 3.0",
    stats: (s) => `🔥 연속 ${s.currentStreak} · 최고 ${s.maxStreak} · ${s.played}판`,
    hint: "의미 유사도(코사인)를 기준으로 순위를 매깁니다. 상위 목록 안에 든 단어만 순위가 표시됩니다.",
  },
  en: {
    subtitle: "Guess words semantically close to the hidden word",
    placeholder: "Type a word",
    submit: "Guess",
    loading: "Loading puzzle…",
    loadFail: "Failed to load the puzzle.",
    notHangul: "Enter a Korean word only",
    duplicate: "Already guessed",
    unknown: "Outside the ranking (not in the top list)",
    guessCount: (n) => `Guess #${n}`,
    closest: "Closest word",
    rankLabel: "Rank",
    won: (n) => `🎉 Solved in ${n} guesses!`,
    reveal: "Give up & reveal",
    revealed: (w) => `The word was "${w}".`,
    playAgain: "Play again",
    share: "Share result",
    copied: "Copied!",
    demoBadge: "Demo puzzle",
    demoCredit: "Handcrafted sample similarity table; this demo does not use fastText data.",
    credit: "Word vectors: fastText Korean (Facebook AI Research), CC BY-SA 3.0",
    stats: (s) => `🔥 Streak ${s.currentStreak} · Best ${s.maxStreak} · ${s.played} played`,
    hint: "Ranking is by semantic (cosine) similarity. Only words inside the served top list show a rank.",
  },
  ja: {
    subtitle: "隠れた単語と意味が近い単語を推測しましょう",
    placeholder: "単語を入力",
    submit: "推測",
    loading: "パズルを読み込み中…",
    loadFail: "パズルを読み込めませんでした。",
    notHangul: "ハングルの単語のみ入力してください",
    duplicate: "既に推測した単語です",
    unknown: "順位圏外（上位リストにありません）",
    guessCount: (n) => `${n}回目の推測`,
    closest: "最も近い単語",
    rankLabel: "順位",
    won: (n) => `🎉 ${n}回で正解！`,
    reveal: "諦めて答えを見る",
    revealed: (w) => `答えは「${w}」でした。`,
    playAgain: "もう一度",
    share: "結果を共有",
    copied: "コピーしました！",
    demoBadge: "デモパズル",
    demoCredit: "手作業で作成した類似度のサンプルです。このデモはfastTextデータを使用していません。",
    credit: "単語ベクトル: fastText Korean (Facebook AI Research), CC BY-SA 3.0",
    stats: (s) => `🔥 連続 ${s.currentStreak} · 最高 ${s.maxStreak} · ${s.played}回`,
    hint: "意味的類似度（コサイン）で順位を付けます。上位リスト内の単語のみ順位が表示されます。",
  },
  zh: {
    subtitle: "猜出与隐藏词语义相近的词",
    placeholder: "输入词语",
    submit: "猜测",
    loading: "正在加载谜题…",
    loadFail: "加载谜题失败。",
    notHangul: "请仅输入韩文词语",
    duplicate: "已经猜过了",
    unknown: "排名之外（不在榜单中）",
    guessCount: (n) => `第 ${n} 次猜测`,
    closest: "最接近的词",
    rankLabel: "排名",
    won: (n) => `🎉 ${n} 次猜中！`,
    reveal: "放弃并查看答案",
    revealed: (w) => `答案是“${w}”。`,
    playAgain: "再玩一次",
    share: "分享结果",
    copied: "已复制！",
    demoBadge: "演示谜题",
    demoCredit: "这是手工制作的相似度示例表；本演示不使用 fastText 数据。",
    credit: "词向量：fastText Korean (Facebook AI Research)，CC BY-SA 3.0",
    stats: (s) => `🔥 连胜 ${s.currentStreak} · 最高 ${s.maxStreak} · ${s.played} 局`,
    hint: "按语义（余弦）相似度排名。只有榜单内的词才显示排名。",
  },
  fr: {
    subtitle: "Devinez des mots proches du sens du mot caché",
    placeholder: "Tapez un mot",
    submit: "Deviner",
    loading: "Chargement du puzzle…",
    loadFail: "Échec du chargement du puzzle.",
    notHangul: "Entrez uniquement un mot coréen",
    duplicate: "Déjà proposé",
    unknown: "Hors classement (absent du top)",
    guessCount: (n) => `Essai n°${n}`,
    closest: "Mot le plus proche",
    rankLabel: "Rang",
    won: (n) => `🎉 Trouvé en ${n} essais !`,
    reveal: "Abandonner et révéler",
    revealed: (w) => `Le mot était « ${w} ».`,
    playAgain: "Rejouer",
    share: "Partager",
    copied: "Copié !",
    demoBadge: "Puzzle démo",
    demoCredit: "Table de similarité d'exemple créée à la main ; cette démo n'utilise pas de données fastText.",
    credit: "Vecteurs : fastText Korean (Facebook AI Research), CC BY-SA 3.0",
    stats: (s) => `🔥 Série ${s.currentStreak} · Record ${s.maxStreak} · ${s.played} parties`,
    hint: "Classement par similarité sémantique (cosinus). Seuls les mots du top affichent un rang.",
  },
  es: {
    subtitle: "Adivina palabras cercanas en significado a la palabra oculta",
    placeholder: "Escribe una palabra",
    submit: "Adivinar",
    loading: "Cargando el puzle…",
    loadFail: "No se pudo cargar el puzle.",
    notHangul: "Introduce solo una palabra coreana",
    duplicate: "Ya la has propuesto",
    unknown: "Fuera del ranking (no está en el top)",
    guessCount: (n) => `Intento n.º ${n}`,
    closest: "Palabra más cercana",
    rankLabel: "Puesto",
    won: (n) => `🎉 ¡Resuelto en ${n} intentos!`,
    reveal: "Rendirse y revelar",
    revealed: (w) => `La palabra era «${w}».`,
    playAgain: "Jugar otra vez",
    share: "Compartir",
    copied: "¡Copiado!",
    demoBadge: "Puzle demo",
    demoCredit: "Tabla de similitud de ejemplo creada a mano; esta demo no usa datos de fastText.",
    credit: "Vectores: fastText Korean (Facebook AI Research), CC BY-SA 3.0",
    stats: (s) => `🔥 Racha ${s.currentStreak} · Mejor ${s.maxStreak} · ${s.played} jugadas`,
    hint: "El ranking es por similitud semántica (coseno). Solo las palabras del top muestran un puesto.",
  },
};

/** Progress width for a guess: closer rank → fuller bar (log-scaled). */
function barWidth(g: Guess): number {
  if (g.band === "secret") return 100;
  if (g.rank == null) return 4;
  // rank 1 → ~96%, decaying as rank grows.
  return Math.max(6, Math.min(96, 100 - Math.log10(g.rank) * 30));
}

const KoreanSemantle: React.FC<{ locale?: UILocale }> = ({ locale = "ko" }) => {
  const t = COPY[locale] ?? COPY.en;
  const bandLabel = BAND_LABEL[locale] ?? BAND_LABEL.en;

  const [status, setStatus] = useState<Status>("loading");
  const [table, setTable] = useState<SimilarityTable | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [input, setInput] = useState("");
  const [toast, setToast] = useState("");
  const [lastWord, setLastWord] = useState<string | null>(null);
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [copied, setCopied] = useState(false);
  const recordedRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const loadPuzzle = useCallback(async () => {
    setStatus("loading");
    try {
      const idxRes = await fetch(`${DATA_BASE}/index.json`);
      const idx = (await idxRes.json()) as { puzzles: string[] };
      const id = dailyPuzzleId(idx.puzzles);
      const res = await fetch(`${DATA_BASE}/${id}.json`);
      if (!res.ok) throw new Error("puzzle fetch failed");
      const data = (await res.json()) as SimilarityTable;
      setTable(data);
      setGuesses([]);
      setLastWord(null);
      recordedRef.current = false;
      setStatus("playing");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadPuzzle();
    setStats(getStreak(GAME_ID));
  }, [loadPuzzle]);

  const submit = useCallback(() => {
    if (!table || status !== "playing") return;
    const result = scoreGuess(table, input, guesses.map((g) => g.word));
    if (!result.ok) {
      flashToast(result.reason === "duplicate" ? t.duplicate : result.reason === "empty" ? "" : t.notHangul);
      return;
    }
    setInput("");
    setLastWord(result.guess.word);
    setGuesses((prev) => [...prev, result.guess]);
    if (!result.guess.known) flashToast(t.unknown);
    if (result.solved) {
      setStatus("won");
      if (!recordedRef.current) {
        recordedRef.current = true;
        setStats(recordStreak(GAME_ID, true));
      }
    }
  }, [table, status, input, guesses, flashToast, t]);

  const reveal = useCallback(() => {
    if (!table) return;
    setStatus("revealed");
    if (!recordedRef.current) {
      recordedRef.current = true;
      setStats(recordStreak(GAME_ID, false));
    }
  }, [table]);

  const share = useCallback(async () => {
    const solved = status === "won";
    const closest = orderGuesses(guesses)[0];
    const line = solved
      ? t.won(guesses.length)
      : `꼬맨틀 — ${t.rankLabel} ${closest?.rank ?? "?"}`;
    const text = `${line}\n${typeof window !== "undefined" ? window.location.href : ""}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }, [status, guesses, t]);

  const ordered = useMemo(() => orderGuesses(guesses), [guesses]);
  const isDemo = table?.meta.source === "handcrafted-demo";

  if (status === "loading") {
    return (
      <div className="not-prose flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
        <p className="text-sm text-muted-foreground font-bold">{t.loading}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="not-prose flex flex-col items-center py-16 gap-4">
        <p className="text-sm text-muted-foreground font-bold">{t.loadFail}</p>
        <button onClick={loadPuzzle} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black">
          {t.playAgain}
        </button>
      </div>
    );
  }

  const over = status === "won" || status === "revealed";

  return (
    <div className="not-prose flex flex-col items-center gap-5 py-6 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="w-full text-center border-b border-border pb-4">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-black tracking-tight">꼬맨틀</h1>
          {isDemo && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {t.demoBadge}
            </span>
          )}
        </div>
        <p className="text-xs font-bold text-muted-foreground mt-1">{t.subtitle}</p>
        {stats && stats.played > 0 && (
          <p className="text-[10px] font-bold text-muted-foreground mt-2">{t.stats(stats)}</p>
        )}
      </div>

      {/* Toast */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="bg-foreground text-background px-5 py-2.5 rounded-xl font-black text-sm shadow-xl whitespace-nowrap">{toast}</div>
      </div>

      {/* Input */}
      {!over && (
        <form
          className="flex w-full gap-2"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            aria-label={t.placeholder}
            autoComplete="off"
            autoCapitalize="off"
            inputMode="text"
            className="flex-1 h-12 rounded-xl border border-border bg-background px-4 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="submit" className="h-12 px-5 rounded-xl bg-primary text-primary-foreground font-black shrink-0">
            {t.submit}
          </button>
        </form>
      )}

      {/* Guess count */}
      <p className="text-[11px] font-bold text-muted-foreground self-start">{t.guessCount(guesses.length)}</p>

      {/* Latest guess highlight */}
      {lastWord && (() => {
        const g = guesses.find((x) => x.word === lastWord);
        if (!g) return null;
        return <GuessRow g={g} highlight bandLabel={bandLabel} rankLabel={t.rankLabel} />;
      })()}

      {/* Ordered guess list (closest first) */}
      <div className="w-full flex flex-col gap-1.5">
        {ordered.map((g) => (
          <GuessRow key={g.word} g={g} bandLabel={bandLabel} rankLabel={t.rankLabel} />
        ))}
      </div>

      {/* End state */}
      {over && (
        <div className="flex flex-col items-center gap-3 pt-2">
          <p className="text-base font-black text-foreground">
            {status === "won" ? t.won(guesses.length) : t.revealed(table?.meta.secret ?? "")}
          </p>
          <div className="flex gap-2">
            <button onClick={share} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black">
              {copied ? t.copied : t.share}
            </button>
          </div>
        </div>
      )}

      {/* Give up */}
      {!over && guesses.length > 0 && (
        <button onClick={reveal} className="text-xs font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground">
          {t.reveal}
        </button>
      )}

      {/* Info */}
      <p className="text-[10px] text-muted-foreground text-center leading-relaxed max-w-md">
        {t.hint}
        <br />
        <span className="opacity-70">{isDemo ? t.demoCredit : t.credit}</span>
      </p>
    </div>
  );
};

const GuessRow: React.FC<{
  g: Guess;
  highlight?: boolean;
  bandLabel: Record<ProximityBand, string>;
  rankLabel: string;
}> = ({ g, highlight, bandLabel, rankLabel }) => {
  const style = BAND_STYLE[g.band];
  return (
    <div className={`relative flex items-center gap-3 rounded-xl border px-3 py-2 ${highlight ? "border-foreground/30 bg-muted/60" : "border-border"}`}>
      <span className="font-black text-sm min-w-0 truncate flex-1">{g.word}</span>
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="w-24 h-2 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-label={`${g.word}: ${bandLabel[g.band]}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(barWidth(g))}
        >
          <div className={`h-full ${style.bar} transition-all`} style={{ width: `${barWidth(g)}%` }} />
        </div>
        <span className="text-[11px] font-bold text-muted-foreground w-16 text-right tabular-nums">
          {g.known ? `${rankLabel} ${g.rank}` : "—"}
        </span>
        <span className={`text-[10px] font-black w-2 h-2 rounded-full ${style.dot}`} aria-hidden="true" />
        <span className="sr-only">{bandLabel[g.band]}</span>
      </div>
    </div>
  );
};

export default KoreanSemantle;
