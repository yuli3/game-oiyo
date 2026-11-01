"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, Share2, Check } from "lucide-react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { celebrate } from "../../lib/games/celebration";
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from "../../lib/games/share-card";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import {
  dailySecretIndex,
  minutesUntilNextKstMidnight,
  koreanSemantleHints,
  orderGuesses,
  parseKoreanSemantle,
  poolPuzzleId,
  scoreGuess,
  SEMANTLE_VECTOR_DIM,
  serializeKoreanSemantle,
  similarityTableFromVectors,
  wordsFromVocabText,
  type Guess,
  type KoreanSemantleHint,
  type ProximityBand,
  type SimilarityTable,
} from "../../lib/games/korean-semantle";
import { getStreak, recordStreak, type StreakStats } from "../../lib/games/records";

function TiltSemantleButton({
  children,
  onClick,
  className = '',
  disabled = false,
  title,
  ariaLabel,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit' | 'reset';
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type={type}
      title={title}
      aria-label={ariaLabel || title}
      onClick={() => {
        triggerPop(0.12);
        onClick?.();
      }}
      disabled={disabled}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`transition-all duration-150 transform-(--card-tilt) will-change-transform ${className}`}
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
    >
      {children}
    </button>
  );
}

type UILocale = "ko" | "en" | "ja" | "zh" | "fr" | "es";
type Status = "loading" | "playing" | "won" | "revealed" | "error";

const DATA_BASE = "/data/korean-semantle";
const GAME_ID = "korean-semantle";
const SAVE_KEY = "oiyo:korean-semantle:v1";
const HINT_KEY_PREFIX = "oiyo:korean-semantle:hints:v1:";
const SOUND_STORAGE_KEY = "korean_semantle_sound_muted";

const BAND_STYLE: Record<ProximityBand, { bar: string; dot: string }> = {
  secret: { bar: "bg-primary", dot: "bg-primary" },
  burning: { bar: "bg-destructive", dot: "bg-destructive" },
  hot: { bar: "bg-destructive/80", dot: "bg-destructive/80" },
  warm: { bar: "bg-chart-1", dot: "bg-chart-1" },
  tepid: { bar: "bg-chart-2", dot: "bg-chart-2" },
  cold: { bar: "bg-chart-3", dot: "bg-chart-3" },
  freezing: { bar: "bg-muted-foreground/60", dot: "bg-muted-foreground/60" },
};

const BAND_LABEL: Record<UILocale, Record<ProximityBand, string>> = {
  ko: { secret: "정답!", burning: "매우 뜨거움", hot: "뜨거움", warm: "따뜻함", tepid: "미지근", cold: "차가움", freezing: "얼음" },
  en: { secret: "Solved!", burning: "Scorching", hot: "Hot", warm: "Warm", tepid: "Tepid", cold: "Cold", freezing: "Freezing" },
  ja: { secret: "正解！", burning: "灼熱", hot: "熱い", warm: "暖かい", tepid: "ぬるい", cold: "冷たい", freezing: "極寒" },
  zh: { secret: "答对了！", burning: "滚烫", hot: "热", warm: "温暖", tepid: "微温", cold: "冷", freezing: "冰冻" },
  fr: { secret: "Trouvé !", burning: "Brûlant", hot: "Chaud", warm: "Tiède+", tepid: "Tiède", cold: "Froid", freezing: "Glacial" },
  es: { secret: "¡Resuelto!", burning: "Ardiente", hot: "Caliente", warm: "Cálido", tepid: "Tibio", cold: "Frío", freezing: "Helado" },
};

const COPY: Record<UILocale, {
  subtitle: string;
  title: string;
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
  sound: string;
  restored: string;
}> = {
  ko: {
    title: "꼬맨틀",
    subtitle: "숨은 단어와 의미가 가까운 단어를 추측하세요",
    placeholder: "단어 입력",
    submit: "추측",
    loading: "퍼즐 불러오는 중…",
    loadFail: "퍼즐을 불러오지 못했습니다.",
    notHangul: "한글 단어만 입력하세요",
    duplicate: "이미 추측한 단어입니다",
    unknown: "이 단어는 목록에 없어요",
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
    hint: "약 2만 개 한글 단어 안에서 의미 유사도로 순위를 매겨요. 목록에 없는 단어는 점수가 없어요.",
    sound: "소리", restored: "오늘의 추측을 이어서 불러왔어요",
  },
  en: {
    title: "Kkomantle",
    subtitle: "Guess words semantically close to the hidden word",
    placeholder: "Type a word",
    submit: "Guess",
    loading: "Loading puzzle…",
    loadFail: "Failed to load the puzzle.",
    notHangul: "Enter a Korean word only",
    duplicate: "Already guessed",
    unknown: "Not in the word list",
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
    hint: "Ranks are cosine similarity inside about 20,000 Korean words. A word outside that list gets no score.",
    sound: "Sound", restored: "Today's guesses were restored",
  },
  ja: {
    title: "꼬맨틀",
    subtitle: "隠れた単語と意味が近い単語を推測しましょう",
    placeholder: "単語を入力",
    submit: "推測",
    loading: "パズルを読み込み中…",
    loadFail: "パズルを読み込めませんでした。",
    notHangul: "ハングルの単語のみ入力してください",
    duplicate: "既に推測した単語です",
    unknown: "単語リストにありません",
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
    hint: "約2万語の韓国語の中でコサイン類似度の順位を付けます。リストにない単語は点数がありません。",
    sound: "サウンド", restored: "今日の推測を復元しました",
  },
  zh: {
    title: "꼬맨틀",
    subtitle: "猜出与隐藏词语义相近的词",
    placeholder: "输入词语",
    submit: "猜测",
    loading: "正在加载谜题…",
    loadFail: "加载谜题失败。",
    notHangul: "请仅输入韩文词语",
    duplicate: "已经猜过了",
    unknown: "不在词表中",
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
    hint: "在约2万个韩语词里按余弦相似度排名。不在列表中的词没有分数。",
    sound: "声音", restored: "已恢复今天的猜测",
  },
  fr: {
    title: "Kkomantle",
    subtitle: "Devinez des mots proches du sens du mot caché",
    placeholder: "Tapez un mot",
    submit: "Deviner",
    loading: "Chargement du puzzle…",
    loadFail: "Échec du chargement du puzzle.",
    notHangul: "Entrez uniquement un mot coréen",
    duplicate: "Déjà proposé",
    unknown: "Absent de la liste",
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
    hint: "Le rang vient de la similarité cosinus dans un bassin d'environ 20 000 mots coréens. Un mot hors liste n'a pas de score.",
    sound: "Son", restored: "Les essais du jour ont été restaurés",
  },
  es: {
    title: "Kkomantle",
    subtitle: "Adivina palabras cercanas en significado a la palabra oculta",
    placeholder: "Escribe una palabra",
    submit: "Adivinar",
    loading: "Cargando el puzle…",
    loadFail: "No se pudo cargar el puzle.",
    notHangul: "Introduce solo una palabra coreana",
    duplicate: "Ya la has propuesto",
    unknown: "No está en la lista",
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
    hint: "El puesto sale de la similitud coseno en un conjunto de unas 20 000 palabras coreanas. Una palabra fuera de la lista no tiene puntuación.",
    sound: "Sonido", restored: "Se restauraron los intentos de hoy",
  },
};

const HINT_COPY: Record<UILocale, { open: string; locked: (n: number) => string; next: (m: number) => string; format: (h: KoreanSemantleHint) => string }> = {
  ko: { open: "공정 힌트 열기", locked: n => `${n}회 추측에서 다음 힌트`, next: m => `다음 퍼즐까지 ${Math.floor(m / 60)}시간 ${m % 60}분 (한국 시간 자정)`, format: h => h.kind === "length" ? `정답은 ${h.value}글자입니다.` : h.kind === "initial" ? `첫 초성은 ${h.value}입니다.` : `고정된 중간 거리 단어: ${h.value} (순위 ${h.rank})` },
  en: { open: "Open fair hint", locked: n => `Next hint at ${n} guesses`, next: m => `Next puzzle in ${Math.floor(m / 60)}h ${m % 60}m (midnight KST)`, format: h => h.kind === "length" ? `The answer has ${h.value} syllables.` : h.kind === "initial" ? `The first Korean initial is ${h.value}.` : `Fixed mid-distance word: ${h.value} (rank ${h.rank})` },
  ja: { open: "公平ヒントを開く", locked: n => `${n}回で次のヒント`, next: m => `次のパズルまで ${Math.floor(m / 60)}時間${m % 60}分（韓国時間の0時）`, format: h => h.kind === "length" ? `答えは${h.value}文字です。` : h.kind === "initial" ? `最初の初声は${h.value}です。` : `固定の中距離語: ${h.value}（順位${h.rank}）` },
  zh: { open: "打开公平提示", locked: n => `猜到${n}次解锁下一提示`, next: m => `距下一题 ${Math.floor(m / 60)}小时${m % 60}分（韩国时间零点）`, format: h => h.kind === "length" ? `答案有${h.value}个韩文音节。` : h.kind === "initial" ? `第一个韩文声母是${h.value}。` : `固定中距离词：${h.value}（排名${h.rank}）` },
  fr: { open: "Ouvrir l’indice équitable", locked: n => `Prochain indice à ${n} essais`, next: m => `Prochain puzzle dans ${Math.floor(m / 60)} h ${m % 60} min (minuit, heure de Corée)`, format: h => h.kind === "length" ? `La réponse compte ${h.value} syllabes.` : h.kind === "initial" ? `L’initiale coréenne est ${h.value}.` : `Mot fixe à distance moyenne : ${h.value} (rang ${h.rank})` },
  es: { open: "Abrir pista justa", locked: n => `Siguiente pista al intento ${n}`, next: m => `Próximo puzle en ${Math.floor(m / 60)} h ${m % 60} min (medianoche, hora de Corea)`, format: h => h.kind === "length" ? `La respuesta tiene ${h.value} sílabas.` : h.kind === "initial" ? `La inicial coreana es ${h.value}.` : `Palabra fija de distancia media: ${h.value} (puesto ${h.rank})` },
};

function barWidth(g: Guess): number {
  if (g.band === "secret") return 100;
  if (g.rank == null) return 4;
  return Math.max(6, Math.min(96, 100 - Math.log10(g.rank) * 30));
}

const KoreanSemantle: React.FC<{ locale?: UILocale }> = ({ locale = "ko" }) => {
  const t = COPY[locale] ?? COPY.en;
  const bandLabel = BAND_LABEL[locale] ?? BAND_LABEL.en;
  const hintCopy = HINT_COPY[locale] ?? HINT_COPY.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: locale as any });

  const [status, setStatus] = useState<Status>("loading");
  const [table, setTable] = useState<SimilarityTable | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [input, setInput] = useState("");
  const [toast, setToast] = useState("");
  const [lastWord, setLastWord] = useState<string | null>(null);
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const [puzzleId, setPuzzleId] = useState("");
  const [sound, setSound] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SOUND_STORAGE_KEY) !== "true";
  });
  const [restored, setRestored] = useState(false);
  const [shownHints, setShownHints] = useState(0);
  const [nextMinutes, setNextMinutes] = useState(() => minutesUntilNextKstMidnight());
  const recordedRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSound = useCallback(() => {
    setSound((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_STORAGE_KEY, String(!next));
      } catch {
        /* storage disabled */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        togglePortal();
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleSound();
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePortal, toggleSound]);

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const loadPuzzle = useCallback(async () => {
    setStatus("loading");
    try {
      const [vocabRes, vecRes] = await Promise.all([
        fetch(`${DATA_BASE}/vocab.txt`),
        fetch(`${DATA_BASE}/vectors.bin`),
      ]);
      if (!vocabRes.ok || !vecRes.ok) throw new Error("pool fetch failed");
      const words = wordsFromVocabText(await vocabRes.text());
      const matrix = new Float32Array(await vecRes.arrayBuffer());
      const now = new Date();
      const data = similarityTableFromVectors(
        words,
        matrix,
        SEMANTLE_VECTOR_DIM,
        dailySecretIndex(words.length, now),
      );
      const id = poolPuzzleId(now);
      const saved = parseKoreanSemantle(localStorage.getItem(SAVE_KEY), id, data);
      setTable(data);
      setPuzzleId(id);
      setGuesses(saved ?? []);
      setRestored(Boolean(saved?.length));
      const unlocked = koreanSemantleHints(data, saved?.length ?? 0).length;
      const storedHints = Number(localStorage.getItem(`${HINT_KEY_PREFIX}${id}`));
      setShownHints(Number.isInteger(storedHints) ? Math.max(0, Math.min(unlocked, storedHints)) : 0);
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

  useEffect(() => {
    const update = () => setNextMinutes(minutesUntilNextKstMidnight());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (table && puzzleId && status === "playing") localStorage.setItem(SAVE_KEY, serializeKoreanSemantle(puzzleId, guesses));
  }, [guesses, puzzleId, status, table]);

  const tone = useCallback((frequency: number) => {
    if (!sound) return;
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const audio = new AudioCtor();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.12);
  }, [sound]);

  const submit = useCallback(() => {
    if (!table || status !== "playing") return;
    const result = scoreGuess(table, input, guesses.map((g) => g.word));
    if (!result.ok) {
      flashToast(result.reason === "duplicate" ? t.duplicate : result.reason === "empty" ? "" : t.notHangul);
      MobileHapticsPro.warningPattern();
      return;
    }
    setInput("");
    setLastWord(result.guess.word);
    setGuesses((prev) => [...prev, result.guess]);
    tone(result.solved ? 760 : result.guess.known ? 320 + Math.max(0, 300 - (result.guess.rank ?? 300)) : 180);

    if (result.solved) {
      localStorage.removeItem(SAVE_KEY);
      setStatus("won");
      MobileHapticsPro.successPattern();
      if (containerRef.current) celebrate(containerRef.current, { preset: "cards" });
      if (!recordedRef.current) {
        recordedRef.current = true;
        setStats(recordStreak(GAME_ID, true));
      }
    } else if (result.guess.known) {
      if ((result.guess.rank ?? 9999) <= 100) {
        MobileHapticsPro.heavyImpact();
      } else if ((result.guess.rank ?? 9999) <= 1000) {
        MobileHapticsPro.mediumImpact();
      } else {
        MobileHapticsPro.lightImpact();
      }
    } else {
      MobileHapticsPro.selectionClick();
      flashToast(t.unknown);
    }
  }, [table, status, input, guesses, flashToast, t, tone, containerRef]);

  const reveal = useCallback(() => {
    if (status !== "playing") return;
    localStorage.removeItem(SAVE_KEY);
    setStatus("revealed");
    MobileHapticsPro.warningPattern();
    if (!recordedRef.current) {
      recordedRef.current = true;
      setStats(recordStreak(GAME_ID, false));
    }
  }, [status]);

  const openNextHint = useCallback(() => {
    if (!table) return;
    const unlocked = koreanSemantleHints(table, guesses.length);
    if (shownHints >= unlocked.length) return;
    const next = shownHints + 1;
    setShownHints(next);
    localStorage.setItem(`${HINT_KEY_PREFIX}${puzzleId}`, String(next));
    MobileHapticsPro.selectionClick();
  }, [guesses.length, puzzleId, shownHints, table]);

  const handleShareCard = useCallback(async () => {
    if (!table) return;
    const isWon = status === "won";
    const bestRank = guesses.reduce((min, g) => (g.rank != null && g.rank < min ? g.rank : min), 9999);
    try {
      const canvas = createShareCardCanvas({
        title: t.title,
        subtitle: `${puzzleId} · ${isWon ? "SOLVED" : "REVEALED"}`,
        score: isWon ? `${guesses.length} Guesses` : "Revealed",
        slug: "korean-semantle",
        qrUrl: typeof window !== "undefined" ? window.location.href : undefined,
        customStats: [
          { label: "GUESSES", value: guesses.length },
          { label: "BEST RANK", value: bestRank < 9999 ? `#${bestRank}` : "—" },
          ...(stats?.currentStreak ? [{ label: "STREAK", value: `${stats.currentStreak} Days` }] : []),
        ],
      });
      const ok = await copyShareCardToClipboard(canvas);
      if (ok) {
        setShareCardCopied(true);
        MobileHapticsPro.successPattern();
        setTimeout(() => setShareCardCopied(false), 2000);
      } else {
        downloadShareCard(canvas, `kkomantle-${puzzleId}.png`);
      }
    } catch {
      // share fallback
    }
  }, [guesses, puzzleId, stats?.currentStreak, status, t.title, table]);

  const share = useCallback(async () => {
    const text = `${t.title} #${puzzleId} · ${guesses.length}회\nhttps://game.oiyo.net/korean-semantle`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      MobileHapticsPro.selectionClick();
      setTimeout(() => setCopied(false), 2000);
    }
  }, [guesses.length, puzzleId, t.title]);

  const ordered = useMemo(() => orderGuesses(guesses), [guesses]);
  const availableHints = useMemo(() => (table ? koreanSemantleHints(table, guesses.length) : []), [guesses.length, table]);
  const nextHintAt = guesses.length < 10 ? 10 : guesses.length < 25 ? 25 : guesses.length < 50 ? 50 : null;

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-75 gap-3">
        <p className="text-sm font-bold text-muted-foreground">{t.loading}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-75 gap-3">
        <p className="text-sm font-bold text-destructive">{t.loadFail}</p>
        <TiltSemantleButton onClick={loadPuzzle} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
          {t.playAgain}
        </TiltSemantleButton>
      </div>
    );
  }

  const over = status === "won" || status === "revealed";
  const isDemo = Boolean((table?.meta as Record<string, unknown> | undefined)?.isDemo);

  const renderHud = () => (
    <div className="flex items-center justify-end gap-2 w-full pb-2">
      <button
        type="button"
        onClick={toggleSound}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-xs transition-colors hover:bg-muted"
        title={sound ? portalLabels.unmute : portalLabels.mute}
        aria-label={sound ? portalLabels.unmute : portalLabels.mute}
      >
        {sound ? <Volume2 className="h-4 w-4 text-foreground" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
      </button>
      <button
        type="button"
        onClick={togglePortal}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-xs transition-colors hover:bg-muted"
        title={isImmersive ? portalLabels.exit : portalLabels.enter}
        aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
      >
        {isImmersive ? <Minimize2 className="h-4 w-4 text-foreground" /> : <Maximize2 className="h-4 w-4 text-foreground" />}
      </button>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`not-prose relative select-none ${
        isImmersive
          ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col items-center overflow-y-auto bg-background p-4 sm:p-6"
          : "flex flex-col items-center gap-5 py-6 px-4 max-w-lg mx-auto"
      }`}
    >
      <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-5">
        {renderHud()}
        <img src="/games/korean-semantle-social.png" alt="" className="h-36 w-full rounded-3xl object-cover shadow-xs sm:h-44" />
        <div className="w-full text-center border-b border-border pb-4">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">{t.title}</h1>
            {isDemo && (
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {t.demoBadge}
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-muted-foreground mt-1">{t.subtitle}</p>
          {stats && stats.played > 0 && (
            <p className="text-xs font-bold text-muted-foreground mt-2">{t.stats(stats)}</p>
          )}
          <p className="mt-1 text-xs font-bold text-primary">{hintCopy.next(nextMinutes)}</p>
        </div>
        {restored && <p role="status" className="w-full rounded-xl bg-primary/10 p-3 text-center text-xs font-bold text-primary">{t.restored}</p>}

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
              className="flex-1 h-12 rounded-xl border border-border bg-background px-4 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <TiltSemantleButton type="submit" className="h-12 px-5 rounded-xl bg-primary text-primary-foreground font-black shrink-0 hover:opacity-90">
              {t.submit}
            </TiltSemantleButton>
          </form>
        )}

        {/* Guess count */}
        <p className="text-xs font-bold text-muted-foreground self-start">{t.guessCount(guesses.length)}</p>

        {!over && (availableHints.length > 0 || nextHintAt) && (
          <section className="w-full rounded-2xl border border-border bg-muted/40 p-3 text-xs text-foreground" aria-label={hintCopy.open}>
            {availableHints.slice(0, shownHints).map(hint => <p key={hint.kind} className="mb-1 font-bold">{hintCopy.format(hint)}</p>)}
            {shownHints < availableHints.length ? (
              <TiltSemantleButton onClick={openNextHint} className="mt-1 min-h-10 rounded-full bg-primary px-4 font-black text-primary-foreground hover:opacity-90">
                {hintCopy.open}
              </TiltSemantleButton>
            ) : nextHintAt ? (
              <p className="text-muted-foreground">{hintCopy.locked(nextHintAt)}</p>
            ) : null}
          </section>
        )}

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
            <div className="flex flex-wrap items-center justify-center gap-2">
              <TiltSemantleButton
                onClick={handleShareCard}
                className="flex min-h-11 items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/20 px-5 text-sm font-bold text-primary shadow-xs hover:bg-primary/30 transition-colors"
                title={shareCardCopied ? "복사됨!" : "결과 카드"}
              >
                {shareCardCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{shareCardCopied ? "복사 완료" : "결과 카드"}</span>
              </TiltSemantleButton>
              <TiltSemantleButton onClick={share} className="min-h-11 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-black hover:bg-muted transition-colors">
                {copied ? t.copied : t.share}
              </TiltSemantleButton>
            </div>
          </div>
        )}

        {/* Give up */}
        {!over && guesses.length > 0 && (
          <button type="button" onClick={reveal} className="text-xs font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground">
            {t.reveal}
          </button>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-md">
          {t.hint}
          <br />
          <span className="opacity-70">{isDemo ? t.demoCredit : t.credit}</span>
        </p>
      </div>
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
      <span className="font-black text-sm min-w-0 truncate flex-1 text-foreground">{g.word}</span>
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
        <span className="text-xs font-bold text-muted-foreground w-16 text-right tabular-nums">
          {g.known ? `${rankLabel} ${g.rank}` : "—"}
        </span>
        <span className={`text-xs font-black size-2 rounded-full ${style.dot}`} aria-hidden="true" />
        <span className="sr-only">{bandLabel[g.band]}</span>
      </div>
    </div>
  );
};

export default KoreanSemantle;
