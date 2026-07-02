import { useState, useRef, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

// ─── Tarot Data Types ─────────────────────────────────────────────────────────

interface TarotCard {
  id: string;
  number?: number;
  suit?: string;
  name: Partial<Record<string, string>>;
  keywords: Partial<Record<string, string[]>>;
  upright: Partial<Record<string, string>>;
  reversed: Partial<Record<string, string>>;
  affirmation?: Partial<Record<string, string>>;
  love?: Partial<Record<string, string>>;
}

// ─── UI i18n ──────────────────────────────────────────────────────────────────

const UI: Record<Locale, {
  title: string;
  subtitle: string;
  drawBtn: string;
  drawingText: string;
  cardOfDay: string;
  upright: string;
  reversed: string;
  keywords: string;
  messageLabel: string;
  affirmationLabel: string;
  loveLabel: string;
  shareLabel: string;
  dateLabel: string;
  clickToReveal: string;
  majorArcana: string;
  minorArcana: string;
}> = {
  ko: {
    title: "오늘의 타로 카드",
    subtitle: "오늘 하루를 안내할 한 장의 카드를 뽑아보세요",
    drawBtn: "카드 뽑기",
    drawingText: "카드를 섞는 중...",
    cardOfDay: "오늘의 카드",
    upright: "정방향",
    reversed: "역방향",
    keywords: "키워드",
    messageLabel: "오늘의 메시지",
    affirmationLabel: "오늘의 확언",
    loveLabel: "사랑 운세",
    shareLabel: "내일도 새로운 카드가 기다려요",
    dateLabel: "오늘",
    clickToReveal: "카드를 클릭해 확인하세요",
    majorArcana: "메이저 아르카나",
    minorArcana: "마이너 아르카나",
  },
  en: {
    title: "Tarot Card of the Day",
    subtitle: "Draw one card to guide your day",
    drawBtn: "Draw Card",
    drawingText: "Shuffling the deck...",
    cardOfDay: "Your Card of the Day",
    upright: "Upright",
    reversed: "Reversed",
    keywords: "Keywords",
    messageLabel: "Today's Message",
    affirmationLabel: "Today's Affirmation",
    loveLabel: "Love Reading",
    shareLabel: "A new card awaits you tomorrow",
    dateLabel: "Today",
    clickToReveal: "Click the card to reveal",
    majorArcana: "Major Arcana",
    minorArcana: "Minor Arcana",
  },
  ja: {
    title: "今日のタロットカード",
    subtitle: "今日一日を導く一枚のカードを引きましょう",
    drawBtn: "カードを引く",
    drawingText: "カードをシャッフル中...",
    cardOfDay: "今日のカード",
    upright: "正位置",
    reversed: "逆位置",
    keywords: "キーワード",
    messageLabel: "今日のメッセージ",
    affirmationLabel: "今日のアファメーション",
    loveLabel: "恋愛運",
    shareLabel: "明日も新しいカードが待っています",
    dateLabel: "今日",
    clickToReveal: "カードをクリックして確認",
    majorArcana: "大アルカナ",
    minorArcana: "小アルカナ",
  },
  fr: {
    title: "Carte de Tarot du Jour",
    subtitle: "Tirez une carte pour guider votre journée",
    drawBtn: "Tirer une Carte",
    drawingText: "Mélange du jeu...",
    cardOfDay: "Votre Carte du Jour",
    upright: "À l'endroit",
    reversed: "Renversée",
    keywords: "Mots-clés",
    messageLabel: "Message du Jour",
    affirmationLabel: "Affirmation du Jour",
    loveLabel: "Lecture Amoureuse",
    shareLabel: "Une nouvelle carte vous attend demain",
    dateLabel: "Aujourd'hui",
    clickToReveal: "Cliquez sur la carte pour révéler",
    majorArcana: "Arcanes Majeurs",
    minorArcana: "Arcanes Mineurs",
  },
  es: {
    title: "Carta de Tarot del Día",
    subtitle: "Saca una carta para guiar tu día",
    drawBtn: "Sacar Carta",
    drawingText: "Barajando el mazo...",
    cardOfDay: "Tu Carta del Día",
    upright: "Derecha",
    reversed: "Invertida",
    keywords: "Palabras Clave",
    messageLabel: "Mensaje del Día",
    affirmationLabel: "Afirmación del Día",
    loveLabel: "Lectura de Amor",
    shareLabel: "Una nueva carta te espera mañana",
    dateLabel: "Hoy",
    clickToReveal: "Haz clic en la carta para revelar",
    majorArcana: "Arcanos Mayores",
    minorArcana: "Arcanos Menores",
  },
  zh: {
    title: "每日塔罗牌",
    subtitle: "抽一张牌来指引你今天的方向",
    drawBtn: "抽牌",
    drawingText: "正在洗牌...",
    cardOfDay: "今日牌卡",
    upright: "正位",
    reversed: "逆位",
    keywords: "关键词",
    messageLabel: "今日信息",
    affirmationLabel: "今日肯定语",
    loveLabel: "爱情运势",
    shareLabel: "明天将有新的牌卡等待你",
    dateLabel: "今天",
    clickToReveal: "点击牌卡查看",
    majorArcana: "大阿卡纳",
    minorArcana: "小阿卡纳",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function getLocaleText(obj: Partial<Record<string, string>>, locale: Locale): string {
  return (
    obj[locale] ??
    obj["en"] ??
    Object.values(obj)[0] ??
    ""
  );
}

function getLocaleKeywords(
  obj: Partial<Record<string, string[]>>,
  locale: Locale
): string[] {
  return obj[locale] ?? obj["en"] ?? Object.values(obj)[0] ?? [];
}

function formatDate(locale: Locale): string {
  const d = new Date();
  try {
    return d.toLocaleDateString(locale === "zh" ? "zh-CN" : locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });
  }
}

// ─── Suit symbol map ──────────────────────────────────────────────────────────
const SUIT_SYMBOLS: Record<string, string> = {
  wands: "🔥",
  cups: "💧",
  swords: "⚡",
  pentacles: "🌿",
};

// ─── Component ────────────────────────────────────────────────────────────────

type Phase = "idle" | "loading" | "flipping" | "revealed";

export default function TarotDailyCard({ locale }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [card, setCard] = useState<TarotCard | null>(null);
  const [isReversed, setIsReversed] = useState(false);
  const [isMajor, setIsMajor] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const ry = (px - 0.5) * 28;
    const rx = -(py - 0.5) * 28;
    const angle = Math.atan2(py - 0.5, px - 0.5) * 180 / Math.PI + 180;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", rx + "deg");
      el.style.setProperty("--ry", ry + "deg");
      el.style.setProperty("--mx", (px * 100) + "%");
      el.style.setProperty("--my", (py * 100) + "%");
      el.style.setProperty("--iri-angle", angle + "deg");
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
  }, []);

  const ui = UI[locale] ?? UI.en;

  async function drawCard() {
    setPhase("loading");
    setFlipped(false);

    try {
      const res = await fetch("/data/tarot/data.json");
      const data = await res.json();

      const major: TarotCard[] = data.major_arcana ?? [];
      const minor: TarotCard[] = data.minor_arcana?.cards ?? [];
      const all = [...major, ...minor];

      const seed = getTodaySeed();
      const rand = seededRand(seed);

      const idx = Math.floor(rand() * all.length);
      const selected = all[idx];
      const rev = rand() > 0.5;
      const maj = idx < major.length;

      setCard(selected);
      setIsReversed(rev);
      setIsMajor(maj);
      setPhase("flipping");
    } catch {
      setPhase("idle");
    }
  }

  function handleCardClick() {
    if (phase === "flipping" && !flipped) {
      setFlipped(true);
      setTimeout(() => setPhase("revealed"), 600);
    }
  }

  const cardName = card ? getLocaleText(card.name, locale) : "";
  const keywords = card ? getLocaleKeywords(card.keywords, locale) : [];
  const message = card
    ? (isReversed ? getLocaleText(card.reversed, locale) : getLocaleText(card.upright, locale))
    : "";
  const affirmation = card?.affirmation ? getLocaleText(card.affirmation, locale) : "";
  const love = card?.love ? getLocaleText(card.love, locale) : "";

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{ui.title}</h1>
        <p className="mt-1 text-gray-500 text-sm">{ui.subtitle}</p>
        <p className="mt-1 text-xs text-gray-400">{ui.dateLabel}: {formatDate(locale)}</p>
      </div>

      {phase === "idle" && (
        <div className="text-center">
          {/* Deck illustration */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-48">
              {[2, 1, 0].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-xl border-2 border-purple-200"
                  style={{
                    transform: `rotate(${(i - 1) * 3}deg)`,
                    background: `linear-gradient(135deg, #4c1d95 0%, #1e1b4b ${50 + i * 10}%, #312e81 100%)`,
                    zIndex: i,
                  }}
                >
                  <div className="w-full h-full rounded-xl flex items-center justify-center">
                    <span className="text-purple-300 text-3xl">✦</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={drawCard}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-base hover:opacity-90 transition-opacity shadow-md"
          >
            {ui.drawBtn}
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div className="text-center py-12">
          <div className="inline-block w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500">{ui.drawingText}</p>
        </div>
      )}

      {(phase === "flipping" || phase === "revealed") && card && (
        <div className="flex flex-col items-center gap-6">
          {/* Card flip area — 3D tilt + iridescent */}
          <div style={{ perspective: "1400px" }}>
            <div
              ref={cardRef}
              onClick={handleCardClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="cursor-pointer"
              style={{
                width: "200px",
                height: "320px",
                position: "relative",
                transformStyle: "preserve-3d",
                transition: flipped ? "transform 1.1s cubic-bezier(.22,.92,.18,1)" : "transform 1.1s cubic-bezier(.22,.92,.18,1)",
                transform: flipped
                  ? `rotateX(var(--rx, 0deg)) rotateY(calc(180deg + var(--ry, 0deg)))`
                  : `rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))`,
                willChange: "transform",
              } as React.CSSProperties}
            >
              {/* Card back */}
              <div
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  borderRadius: "8px",
                  background: "linear-gradient(180deg, #0e0a1c 0%, #0a0716 60%, #07040e 100%)",
                  border: "1px solid rgba(139,92,246,0.35)",
                  boxShadow: "0 30px 60px -20px rgba(0,0,0,.9), 0 10px 20px -5px rgba(0,0,0,.7)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {/* Mystical back pattern */}
                <div style={{ position: "absolute", inset: "14px", border: "1px solid rgba(192,168,255,0.22)", borderRadius: "3px", display: "grid", placeItems: "center" }}>
                  <div style={{ position: "absolute", inset: "24px", border: "1px solid rgba(192,168,255,0.14)", borderRadius: "2px" }} />
                  <div style={{ width: "60%", aspectRatio: "1", border: "1px solid rgba(192,168,255,0.28)", borderRadius: "50%", display: "grid", placeItems: "center", position: "relative" }}>
                    <span style={{ position: "absolute", fontFamily: "serif", fontSize: "32px", color: "rgba(192,168,255,0.6)" }}>✦</span>
                  </div>
                  <span style={{ position: "absolute", bottom: "10px", left: 0, right: 0, textAlign: "center", fontSize: "8px", letterSpacing: "0.36em", color: "rgba(192,168,255,0.45)", textTransform: "uppercase" }}>oracle</span>
                </div>
                {/* Iridescent layers */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", opacity: 0.7, background: "conic-gradient(from var(--iri-angle, 220deg) at var(--mx, 50%) var(--my, 50%), #b8e8ff, #f4d4ff, #ffe4d0, #d0fff4, #e0d4ff, #b8e8ff)", filter: "blur(14px) saturate(1.2)" }} />
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.45, background: "radial-gradient(120% 140% at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,.7), transparent 38%)", filter: "blur(18px)" }} />
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", opacity: 0.6, background: "radial-gradient(180px 220px at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,.5) 0%, rgba(255,255,255,.15) 30%, transparent 60%)" }} />
                {!flipped && (
                  <p style={{ position: "absolute", bottom: "44px", fontSize: "10px", letterSpacing: "0.2em", color: "rgba(192,168,255,0.6)", textTransform: "uppercase" }}>{ui.clickToReveal}</p>
                )}
              </div>

              {/* Card front */}
              <div
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  borderRadius: "8px",
                  background: isReversed
                    ? "linear-gradient(180deg, #1c1008 0%, #100a04 100%)"
                    : "linear-gradient(180deg, #100a22 0%, #0a0716 60%, #08050f 100%)",
                  border: `1px solid ${isReversed ? "rgba(217,119,6,0.4)" : "rgba(139,92,246,0.35)"}`,
                  boxShadow: "0 30px 60px -20px rgba(0,0,0,.9)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  padding: "14px",
                }}
              >
                <div style={{ position: "absolute", inset: "14px", border: `1px solid ${isReversed ? "rgba(217,119,6,0.3)" : "rgba(192,168,255,0.22)"}`, borderRadius: "3px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", letterSpacing: "0.4em", color: isReversed ? "rgba(217,119,6,0.7)" : "rgba(192,168,255,0.6)", textTransform: "uppercase", fontFamily: "monospace" }}>{isReversed ? ui.reversed : ui.upright}</span>
                  <div style={{ transform: isReversed ? "rotate(180deg)" : "none", textAlign: "center" }}>
                    {card.suit ? (
                      <span style={{ fontSize: "40px", display: "block", marginBottom: "8px" }}>{SUIT_SYMBOLS[card.suit] ?? "🔮"}</span>
                    ) : (
                      <span style={{ fontSize: "40px", display: "block", marginBottom: "8px" }}>🌟</span>
                    )}
                    <p style={{ fontFamily: "serif", fontWeight: "bold", fontSize: "13px", letterSpacing: "0.2em", color: isReversed ? "#d97706" : "rgba(232,228,255,0.9)", textTransform: "uppercase" }}>
                      {cardName}
                    </p>
                  </div>
                </div>
                {/* Iridescent on front too */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", opacity: 0.5, background: "conic-gradient(from var(--iri-angle, 220deg) at var(--mx, 50%) var(--my, 50%), #b8e8ff, #f4d4ff, #ffe4d0, #d0fff4, #e0d4ff, #b8e8ff)", filter: "blur(16px)" }} />
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", opacity: 0.45, background: "radial-gradient(160px 200px at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,.45) 0%, rgba(255,255,255,.1) 30%, transparent 60%)" }} />
              </div>
            </div>
          </div>

          {phase === "flipping" && !flipped && (
            <p className="text-sm text-gray-500 animate-pulse">{ui.clickToReveal}</p>
          )}

          {/* Revealed info */}
          {phase === "revealed" && (
            <div className="w-full space-y-4">
              {/* Card header */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">
                      {isMajor ? ui.majorArcana : ui.minorArcana}
                      {card.suit ? ` · ${card.suit}` : ""}
                    </p>
                    <h2 className="text-xl font-black text-gray-900">{cardName}</h2>
                    <span
                      className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isReversed
                          ? "bg-amber-100 text-amber-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {isReversed ? ui.reversed : ui.upright}
                    </span>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{ui.dateLabel}</p>
                    <p className="font-medium text-gray-600">{formatDate(locale)}</p>
                  </div>
                </div>

                {keywords.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">{ui.keywords}</p>
                    <div className="flex flex-wrap gap-1">
                      {keywords.slice(0, 4).map((kw, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Today's message */}
              <div className={`rounded-2xl p-5 ${isReversed ? "bg-amber-50 border border-amber-100" : "bg-purple-50 border border-purple-100"}`}>
                <h3 className={`font-bold text-sm mb-2 ${isReversed ? "text-amber-700" : "text-purple-700"}`}>
                  {ui.messageLabel}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
              </div>

              {/* Affirmation */}
              {affirmation && (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                  <h3 className="font-bold text-sm text-green-700 mb-1">{ui.affirmationLabel}</h3>
                  <p className="text-sm text-green-800 italic">"{affirmation}"</p>
                </div>
              )}

              {/* Love */}
              {love && (
                <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
                  <h3 className="font-bold text-sm text-pink-700 mb-1">{ui.loveLabel}</h3>
                  <p className="text-sm text-pink-800">{love}</p>
                </div>
              )}

              {/* Footer note */}
              <p className="text-center text-xs text-gray-400 py-2">{ui.shareLabel}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
