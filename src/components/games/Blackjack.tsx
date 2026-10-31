import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Share2, Volume2, VolumeX } from "lucide-react";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import { GameContainer, PlayingCard } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { celebrate } from "../../lib/games/celebration";
import { copyShareCardToClipboard, createShareCardCanvas, downloadShareCard } from "../../lib/games/share-card";
import { blackjackAdvice, blackjackResultReason, createBlackjackGame, doubleBlackjack, evaluateBlackjackHand, hitBlackjack, standBlackjack, type BlackjackAdviceReason, type BlackjackOutcome, type BlackjackResultReason, type BlackjackState } from "../../lib/games/blackjack";
import { clearBlackjackSave, loadBlackjackSave, storeBlackjackSave } from "../../lib/games/blackjack-save";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";

const COPY = {
  ko: { title: "블랙잭", subtitle: "S17 클래식 · 확률과 위험", hit: "카드 받기 · H", stand: "멈추기 · S", double: "더블 다운 · D", reset: "새 라운드", score: "합계", win: "승리!", lost: "패배", push: "무승부", dealer: "딜러", player: "나", hidden: "숨은 카드", pause: "일시정지", resume: "계속하기", sound: "소리", restored: "이전 라운드를 일시정지 상태로 복원했어요", soft: "소프트", hard: "하드", cards: "받은 카드", remaining: "남은 덱", record: "전적", next: "다음 목표", rules: "딜러는 모든 17에서 멈춥니다. 자연 블랙잭을 일반 21보다 먼저 판정합니다.", bankroll: "보유 칩", bet: "베팅", doubleDown: "더블 다운 (2배 베팅)", dealerBust: "💥 딜러 버스트!", shareCard: "결과 카드 복사", shareCopied: "✓ 카드 복사됨" },
  en: { title: "Blackjack", subtitle: "Classic S17 · probability and risk", hit: "Hit · H", stand: "Stand · S", double: "Double Down · D", reset: "New round", score: "Total", win: "You win!", lost: "You lost", push: "Push", dealer: "Dealer", player: "You", hidden: "Hidden card", pause: "Pause", resume: "Resume", sound: "Sound", restored: "Previous round restored and paused", soft: "Soft", hard: "Hard", cards: "Cards drawn", remaining: "Deck left", record: "Record", next: "Next target", rules: "Dealer stands on every 17. Natural blackjack is settled before an ordinary 21.", bankroll: "Bankroll", bet: "Bet", doubleDown: "Double Down (2x bet)", dealerBust: "💥 Dealer Bust!", shareCard: "Share Card", shareCopied: "✓ Card Copied" },
  ja: { title: "ブラックジャック", subtitle: "クラシックS17 · 確率とリスク", hit: "ヒット · H", stand: "スタンド · S", double: "ダブルダウン · D", reset: "新しいラウンド", score: "合計", win: "勝利！", lost: "敗北", push: "引き分け", dealer: "ディーラー", player: "あなた", hidden: "伏せ札", pause: "一時停止", resume: "再開", sound: "サウンド", restored: "前のラウンドを一時停止で復元しました", soft: "ソフト", hard: "ハード", cards: "引いた枚数", remaining: "残り山札", record: "戦績", next: "次の目標", rules: "ディーラーはすべての17でスタンド。ナチュラルを通常の21より先に判定します。", bankroll: "所持チップ", bet: "ベット", doubleDown: "ダブルダウン (2倍)", dealerBust: "💥 ディーラーバースト！", shareCard: "結果カード共有", shareCopied: "✓ コピー完了" },
  zh: { title: "二十一点", subtitle: "经典S17 · 概率与风险", hit: "要牌 · H", stand: "停牌 · S", double: "双倍下注 · D", reset: "新一局", score: "点数", win: "你赢了！", lost: "你输了", push: "平局", dealer: "庄家", player: "你", hidden: "暗牌", pause: "暂停", resume: "继续", sound: "声音", restored: "已恢复并暂停上一局", soft: "软牌", hard: "硬牌", cards: "要牌数", remaining: "剩余牌", record: "战绩", next: "下个目标", rules: "庄家在所有17点停牌。天然黑杰克优先于普通21点结算。", bankroll: "筹码余额", bet: "下注", doubleDown: "双倍下注 (2倍)", dealerBust: "💥 庄家爆牌！", shareCard: "分享战绩卡", shareCopied: "✓ 已复制卡片" },
  fr: { title: "Blackjack", subtitle: "S17 classique · probabilité et risque", hit: "Tirer · H", stand: "Rester · S", double: "Doubler · D", reset: "Nouvelle manche", score: "Total", win: "Gagné !", lost: "Perdu", push: "Égalité", dealer: "Croupier", player: "Vous", hidden: "Carte cachée", pause: "Pause", resume: "Reprendre", sound: "Son", restored: "Manche précédente restaurée en pause", soft: "Souple", hard: "Dur", cards: "Cartes tirées", remaining: "Paquet restant", record: "Bilan", next: "Prochain objectif", rules: "Le croupier reste sur tous les 17. Un blackjack naturel prime un 21 ordinaire.", bankroll: "Solde de jetons", bet: "Mise", doubleDown: "Doubler la mise", dealerBust: "💥 Croupier Brûlé !", shareCard: "Partager la carte", shareCopied: "✓ Carte copiée" },
  es: { title: "Blackjack", subtitle: "S17 clásico · probabilidad y riesgo", hit: "Pedir · H", stand: "Plantarse · S", double: "Doblar · D", reset: "Nueva ronda", score: "Total", win: "¡Ganaste!", lost: "Perdiste", push: "Empate", dealer: "Crupier", player: "Tú", hidden: "Carta oculta", pause: "Pausa", resume: "Continuar", sound: "Sonido", restored: "Ronda anterior restaurada y pausada", soft: "Suave", hard: "Dura", cards: "Cartas pedidas", remaining: "Mazo restante", record: "Historial", next: "Siguiente meta", rules: "El crupier se planta en todo 17. El blackjack natural se resuelve antes que un 21 normal.", bankroll: "Fichas", bet: "Apuesta", doubleDown: "Doblar apuesta", dealerBust: "💥 ¡Crupier se pasa!", shareCard: "Compartir tarjeta", shareCopied: "✓ Tarjeta copiada" },
} as const;

const STRATEGY_COPY: Record<string, { guide: string; hit: string; stand: string; trail: string; reasons: Record<BlackjackAdviceReason, string>; results: Record<BlackjackResultReason, string> }> = {
  ko: { guide: "현재 수 참고", hit: "받기", stand: "멈추기", trail: "선택", reasons: { "low-total": "합계가 낮아 한 장을 더 받아도 버스트 위험이 작습니다.", "dealer-weak": "딜러의 공개 카드가 약합니다. 먼저 버스트할 가능성을 기다립니다.", "dealer-strong": "딜러 공개 카드가 강합니다. 현재 합계로는 한 장을 더 보는 쪽입니다.", "soft-flex": "에이스를 1로 바꿀 수 있어 한 장을 더 받을 여지가 있습니다.", "safe-total": "현재 합계가 충분히 높습니다. 더 받으면 버스트 위험이 커집니다." }, results: { natural: "두 장으로 만든 21, 또는 딜러의 내추럴로 바로 결론 났습니다.", "player-bust": "내 합계가 21을 넘었습니다.", "dealer-bust": "딜러 합계가 21을 넘었습니다.", higher: "21 이하에서 내 합계가 더 높았습니다.", lower: "21 이하에서 딜러 합계가 더 높았습니다.", equal: "두 합계가 같았습니다." } },
  en: { guide: "Current-hand guide", hit: "Hit", stand: "Stand", trail: "Choices", reasons: { "low-total": "The total is low enough that another card carries limited bust risk.", "dealer-weak": "The dealer shows a weak card. Stand and make the dealer complete the hand.", "dealer-strong": "The dealer shows a strong card. This total usually needs another card.", "soft-flex": "The ace can fall from 11 to 1, leaving room for another card.", "safe-total": "The total is strong enough; another card adds too much bust risk." }, results: { natural: "A two-card 21, or the dealer’s natural, settled the round immediately.", "player-bust": "Your total went over 21.", "dealer-bust": "The dealer went over 21.", higher: "Your total was higher without exceeding 21.", lower: "The dealer’s total was higher without exceeding 21.", equal: "Both totals were equal." } },
  ja: { guide: "現在の手の参考", hit: "ヒット", stand: "スタンド", trail: "選択", reasons: { "low-total": "合計が低く、もう1枚引いてもバーストの危険が小さい局面です。", "dealer-weak": "ディーラーの公開札が弱いため、スタンドして完成を待ちます。", "dealer-strong": "ディーラーの公開札が強く、この合計ではもう1枚見る局面です。", "soft-flex": "エースを1に下げられるため、もう1枚引く余地があります。", "safe-total": "十分高い合計で、追加カードのバースト危険が大きい局面です。" }, results: { natural: "2枚の21、またはディーラーのナチュラルで即決しました。", "player-bust": "あなたの合計が21を超えました。", "dealer-bust": "ディーラーが21を超えました。", higher: "21以下であなたの合計が上でした。", lower: "21以下でディーラーの合計が上でした。", equal: "両者の合計が同じでした。" } },
  zh: { guide: "当前手牌参考", hit: "要牌", stand: "停牌", trail: "选择", reasons: { "low-total": "点数较低，再拿一张的爆牌风险较小。", "dealer-weak": "庄家明牌较弱，停牌等待庄家完成手牌。", "dealer-strong": "庄家明牌较强，当前点数通常需要再看一张。", "soft-flex": "A可以从11降为1，还有再拿一张的空间。", "safe-total": "当前点数已经较高，再拿一张的爆牌风险更大。" }, results: { natural: "两张牌21点，或庄家天然黑杰克，直接结算。", "player-bust": "你的点数超过21。", "dealer-bust": "庄家点数超过21。", higher: "未超过21时，你的点数更高。", lower: "未超过21时，庄家点数更高。", equal: "双方点数相同。" } },
  fr: { guide: "Repère pour la main", hit: "Tirer", stand: "Rester", trail: "Choix", reasons: { "low-total": "Le total est bas et le risque de dépasser reste limité.", "dealer-weak": "La carte visible du croupier est faible. Restez et laissez-le finir.", "dealer-strong": "La carte visible est forte; ce total demande généralement une carte.", "soft-flex": "L’as peut passer de 11 à 1, laissant de la marge pour tirer.", "safe-total": "Le total est assez fort; tirer augmente trop le risque de dépasser." }, results: { natural: "Un 21 en deux cartes, ou le naturel du croupier, a réglé la manche.", "player-bust": "Votre total a dépassé 21.", "dealer-bust": "Le croupier a dépassé 21.", higher: "Votre total était supérieur sans dépasser 21.", lower: "Le total du croupier était supérieur sans dépasser 21.", equal: "Les deux totaux étaient égaux." } },
  es: { guide: "Guía de la mano", hit: "Pedir", stand: "Plantarse", trail: "Decisiones", reasons: { "low-total": "El total es bajo y otra carta tiene poco riesgo de pasarse.", "dealer-weak": "La carta visible del crupier es débil. Plántate y deja que complete la mano.", "dealer-strong": "La carta visible es fuerte; este total suele necesitar otra carta.", "soft-flex": "El as puede bajar de 11 a 1, dejando margen para otra carta.", "safe-total": "El total ya es fuerte; otra carta aumenta demasiado el riesgo." }, results: { natural: "Un 21 de dos cartas, o el natural del crupier, cerró la ronda.", "player-bust": "Tu total superó 21.", "dealer-bust": "El crupier superó 21.", higher: "Tu total fue mayor sin superar 21.", lower: "El total del crupier fue mayor sin superar 21.", equal: "Los dos totales fueron iguales." } },
};

const BANKROLL_KEY = "oiyo_blackjack_bankroll";
const DEFAULT_BANKROLL = 1000;
const BET_STEPS = [25, 50, 100, 250];

const getTierName = (bankroll: number, locale: string) => {
  if (bankroll >= 5000) return locale === "ko" ? "몬테카를로 고래 (Whale)" : "Whale VIP";
  if (bankroll >= 2000) return locale === "ko" ? "카지노 VIP" : "Casino VIP";
  if (bankroll >= 500) return locale === "ko" ? "하이롤러 주니어" : "High Roller";
  return locale === "ko" ? "신입 베터" : "Rookie";
};

function TiltPlayerCard({
  card,
  index,
  isNaturalCard,
  reducedMotion,
}: {
  card: { suit: any; value: any };
  index: number;
  isNaturalCard: boolean;
  reducedMotion: boolean;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();
  return (
    <span
      style={{
        '--card-tilt': transformCss,
        ...(!reducedMotion ? { animationDelay: `${index * 70}ms` } : {}),
      } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.12);
        MobileHapticsPro.light();
      }}
      className={`inline-block cursor-pointer will-change-transform transform-(--card-tilt) ${
        !reducedMotion ? "oiyo-card-deal" : ""
      } ${
        isNaturalCard ? "ring-4 ring-primary rounded-xl shadow-xl shadow-primary/30 animate-pulse z-10" : ""
      }`}
    >
      <PlayingCard suit={card.suit} value={card.value} className="border-2 border-primary shadow-md" />
    </span>
  );
}

const Blackjack = ({ locale = "ko" }: { locale?: string }) => {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const strategy = STRATEGY_COPY[locale] ?? STRATEGY_COPY.en;
  const reducedMotion = usePrefersReducedMotion();
  const [game, setGame] = useState<BlackjackState>(() => createBlackjackGame(1));
  const [paused, setPaused] = useState(false), [restored, setRestored] = useState(false);
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || "ko" });

  const [bankroll, setBankroll] = useState<number>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem(BANKROLL_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      }
    } catch {}
    return DEFAULT_BANKROLL;
  });

  const [currentBet, setCurrentBet] = useState<number>(100);
  const [activeRoundBet, setActiveRoundBet] = useState<number>(100);
  const [shareCardCopied, setShareCardCopied] = useState(false);

  const [muted, setMuted] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem("blackjack_sound_muted") === "true";
      }
    } catch {}
    return false;
  });
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("blackjack_sound_muted", String(muted));
      }
    } catch {}
  }, [muted]);

  const [record, setRecord] = useState<GameRecord | null>(null);
  const audio = useRef<AudioContext | null>(null), endedSeed = useRef<number | null>(null);

  const tone = useCallback((kind: "card" | "chip" | BlackjackOutcome) => {
    if (mutedRef.current || typeof AudioContext === "undefined") return;
    const context = audio.current ?? new AudioContext(); audio.current = context;
    if (kind === "chip") {
      // Ceramic casino chip clink sound: two rapid high metallic ticks
      const now = context.currentTime;
      [2800, 4200].forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.025);
        gain.gain.setValueAtTime(0.04, now + i * 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.025 + 0.035);
        osc.connect(gain).connect(context.destination);
        osc.start(now + i * 0.025);
        osc.stop(now + i * 0.025 + 0.035);
      });
      return;
    }
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.frequency.value = kind === "card" ? 320 : kind === "win" ? 620 : kind === "push" ? 420 : 150;
    oscillator.type = kind === "lost" ? "sawtooth" : "sine"; gain.gain.setValueAtTime(.045, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .11);
    oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .11);
  }, []);

  const start = useCallback(() => {
    clearBlackjackSave(); const seed = typeof crypto !== "undefined" ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now() >>> 0;
    setGame(createBlackjackGame(seed)); setPaused(false); setRestored(false); endedSeed.current = null;
    setActiveRoundBet(Math.min(currentBet, bankroll > 0 ? bankroll : 100));
    tone("chip");
  }, [bankroll, currentBet, tone]);

  useEffect(() => {
    setRecord(getRecord("blackjack")); const saved = loadBlackjackSave();
    if (saved) { setGame(saved.state); setPaused(true); setRestored(true); } else start();
    const hidden = () => { if (document.hidden) setPaused(true); }; document.addEventListener("visibilitychange", hidden);
    return () => { document.removeEventListener("visibilitychange", hidden); void audio.current?.close(); };
  }, [start]);

  useEffect(() => {
    if (game.status === "playing") { storeBlackjackSave(game); return; }
    clearBlackjackSave(); if (!game.outcome || endedSeed.current === game.seed) return;
    endedSeed.current = game.seed; tone(game.outcome); setRecord(recordResult("blackjack", game.outcome === "win" ? "w" : game.outcome === "push" ? "d" : "l"));

    // Bankroll settlement
    const isDoubled = game.actions.includes("double");
    const betMultiplier = isDoubled ? 2 : 1;
    const wager = activeRoundBet * betMultiplier;

    setBankroll((prev) => {
      let delta = 0;
      if (game.outcome === "win") {
        const playerScore = evaluateBlackjackHand(game.player);
        const isNatural = game.player.length === 2 && playerScore.total === 21;
        delta = isNatural ? Math.floor(wager * 1.5) : wager;
      } else if (game.outcome === "lost") {
        delta = -wager;
      }
      const updated = Math.max(0, prev + delta);
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(BANKROLL_KEY, String(updated === 0 ? 500 : updated));
        }
      } catch {}
      return updated === 0 ? 500 : updated;
    });

    const dealerScore = evaluateBlackjackHand(game.dealer);
    const playerScore = evaluateBlackjackHand(game.player);
    const isNatural = game.outcome === "win" && playerScore.total === 21 && game.player.length === 2;
    if (isNatural) {
      if (containerRef.current) celebrate(containerRef.current, { preset: "coins" });
    } else if (game.outcome === "win" && dealerScore.total > 21) {
      if (containerRef.current) celebrate(containerRef.current, { preset: "shards" });
    }
  }, [activeRoundBet, game, tone]);

  const hit = useCallback(() => {
    if (paused || game.status !== "playing") return;
    const next = hitBlackjack(game);
    if (next !== game) {
      tone("card");
      MobileHapticsPro.light();
      setGame(next);
    }
  }, [game, paused, tone]);

  const stand = useCallback(() => {
    if (paused || game.status !== "playing") return;
    MobileHapticsPro.light();
    setGame(standBlackjack(game));
  }, [game, paused]);

  const double = useCallback(() => {
    if (paused || game.status !== "playing" || game.player.length !== 2) return;
    tone("chip");
    MobileHapticsPro.impact();
    const next = doubleBlackjack(game);
    setGame(next);
  }, [game, paused, tone]);

  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      if (key === "f") {
        event.preventDefault();
        togglePortal();
      } else if (key === "m") {
        event.preventDefault();
        setMuted((prev) => !prev);
      } else if (key === "h") {
        event.preventDefault();
        hit();
      } else if (key === "s") {
        event.preventDefault();
        stand();
      } else if (key === "d") {
        event.preventDefault();
        double();
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [double, hit, stand, togglePortal]);

  const playerScore = evaluateBlackjackHand(game.player), dealerScore = evaluateBlackjackHand(game.dealer), reveal = game.status === "result";
  const isNatural = game.outcome === "win" && playerScore.total === 21 && game.player.length === 2;
  const advice = game.status === "playing" ? blackjackAdvice(game.player, game.dealer[0]) : null;
  const resultReason = blackjackResultReason(game);
  const actionTrail = game.actions.map(action => action === "hit" ? strategy.hit : action === "double" ? (locale === "ko" ? "더블" : "Double") : strategy.stand).join(" → ");
  const totalGames = record ? record.w + record.l + record.d : 0;
  const winRate = totalGames > 0 ? Math.round((record?.w ?? 0) / totalGames * 100) : 0;
  const tier = getTierName(bankroll, locale);

  const handleShareCard = useCallback(async () => {
    try {
      const canvas = createShareCardCanvas({
        title: t.title,
        subtitle: `Classic S17 · ${tier}`,
        score: `${bankroll.toLocaleString()} Chips`,
        bestScore: `${record?.w ?? 0}W - ${record?.l ?? 0}L`,
        slug: "blackjack",
        locale,
        customStats: [
          { label: t.bankroll, value: `${bankroll.toLocaleString()} 🪙` },
          { label: t.record, value: `${record ? `${record.w}W ${record.l}L ${record.d}D` : "0-0-0"}` },
          { label: "WIN RATE", value: `${winRate}%` },
        ],
      });
      const success = await copyShareCardToClipboard(canvas);
      if (success) {
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2500);
      } else {
        downloadShareCard(canvas, `blackjack-${bankroll}-chips.png`);
      }
    } catch {
      /* best effort */
    }
  }, [bankroll, locale, record, t.bankroll, t.record, t.title, tier, winRate]);

  return (
    <div
      ref={containerRef}
      data-game-surface
      className={
        isImmersive
          ? "fixed inset-0 z-50 w-screen h-dvh bg-background p-3 sm:p-5 overflow-y-auto flex flex-col justify-between m-0 select-none"
          : "relative"
      }
    >
      <GameContainer title={t.title} subtitle={t.subtitle} onReset={start}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-chart-3/15 px-2.5 py-1 text-chart-3 font-black">
              🪙 {bankroll.toLocaleString()}
            </span>
            <span className="text-muted-foreground">{t.record} {record ? `${record.w}–${record.l}–${record.d}` : "0–0–0"}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setPaused(value => !value); setRestored(false); }} disabled={game.status !== "playing"} className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50">{paused ? `▶ ${t.resume}` : `Ⅱ ${t.pause}`}</button>
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              aria-pressed={muted}
              aria-label={muted ? portalLabels.unmute : portalLabels.mute}
              title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`}
              className="min-h-11 px-3 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              <span className="hidden sm:inline">{muted ? portalLabels.unmute : portalLabels.mute}</span>
            </button>
            <button
              type="button"
              onClick={togglePortal}
              aria-pressed={isImmersive}
              aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
              title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
              className="min-h-11 px-3 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
            </button>
          </div>
        </div>

        {/* Bet selector when ready for new round */}
        {game.status !== "playing" && (
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/60 bg-muted/30 p-2.5 text-xs font-bold">
            <span className="text-muted-foreground">{t.bet}:</span>
            {BET_STEPS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  setCurrentBet(amount);
                  tone("chip");
                }}
                className={`min-h-9 rounded-lg px-3 py-1 transition-all ${
                  currentBet === amount
                    ? "bg-chart-3 text-primary-foreground font-black shadow-sm"
                    : "bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                🪙 {amount}
              </button>
            ))}
          </div>
        )}

        {(paused || restored) && game.status === "playing" && <p role="status" className="mb-4 text-center text-xs font-bold text-muted-foreground">{restored ? t.restored : t.pause}</p>}
        <div className="space-y-7 sm:space-y-10">
          <section className="text-center" aria-label={t.dealer}>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">
              {t.dealer} {reveal ? `· ${dealerScore.total} ${dealerScore.soft ? t.soft : t.hard}` : ""}
              {reveal && dealerScore.total > 21 && (
                <span className="ml-2 font-black text-destructive">{t.dealerBust}</span>
              )}
            </p>
            <div className="flex min-h-28 justify-center -space-x-9">
              {game.dealer.map((card, index) => (
                <span key={`${card.suit}-${card.value}-${index}`} className={!reducedMotion ? "oiyo-card-deal" : undefined} style={!reducedMotion ? { animationDelay: `${index * 70}ms` } : undefined}>
                  <PlayingCard suit={card.suit} value={card.value} isFaceUp={index === 0 || reveal} className="border-2 border-primary/20 shadow-md" />
                </span>
              ))}
            </div>
          </section>

          <div className="min-h-12 text-center" aria-live="assertive">
            {game.outcome && (
              <div className="flex flex-col items-center gap-1.5">
                <div role="status" className={`inline-block rounded-full px-7 py-2 text-lg font-black ${!reducedMotion ? "animate-in zoom-in-95" : ""} ${game.outcome === "win" ? "bg-primary text-primary-foreground" : game.outcome === "lost" ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>
                  {t[game.outcome]}
                </div>
                {game.outcome === "win" && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-xs font-black text-primary">
                    <span>🪙 {activeRoundBet * (game.actions.includes("double") ? 2 : 1)}</span>
                    <span className="text-muted-foreground">×</span>
                    <span className="text-chart-1 font-extrabold">{isNatural ? "2.5x Natural" : "2.0x Win"}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="text-primary font-black">+🪙 {Math.round(activeRoundBet * (game.actions.includes("double") ? 2 : 1) * (isNatural ? 1.5 : 1))}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <section className="text-center" aria-label={t.player}>
            <div className="mb-3 flex min-h-28 justify-center -space-x-9">
              {game.player.map((card, index) => {
                const isNaturalCard = isNatural && !reducedMotion;
                return (
                  <TiltPlayerCard
                    key={`${card.suit}-${card.value}-${index}`}
                    card={card}
                    index={index}
                    isNaturalCard={isNaturalCard}
                    reducedMotion={reducedMotion}
                  />
                );
              })}
            </div>
            <p className="mb-4 text-xs font-black uppercase tracking-widest text-primary">
              {t.player} · {t.score} {playerScore.total} · {playerScore.soft ? t.soft : t.hard}
              <span className="ml-2 text-muted-foreground font-normal">({t.bet}: 🪙 {activeRoundBet * (game.actions.includes("double") ? 2 : 1)})</span>
            </p>

            {game.status === "playing" ? (
              <div>
                {advice && (
                  <div className="mx-auto mb-4 max-w-sm rounded-2xl border border-chart-3/40 bg-chart-3/10 p-3 text-left text-xs text-foreground">
                    <p className="font-black text-chart-3">{strategy.guide}: {advice.action === "hit" ? strategy.hit : strategy.stand}</p>
                    <p className="mt-1 leading-5 text-muted-foreground">{strategy.reasons[advice.reason]}</p>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={hit} disabled={paused} className="min-h-12 rounded-full bg-primary px-7 font-black text-primary-foreground disabled:opacity-50">{t.hit}</button>
                  <button type="button" onClick={stand} disabled={paused} className="min-h-12 rounded-full border bg-muted px-7 font-black disabled:opacity-50">{t.stand}</button>
                  {game.player.length === 2 && (
                    <button
                      type="button"
                      onClick={double}
                      disabled={paused}
                      className="min-h-12 rounded-full border-2 border-chart-3 bg-chart-3/10 px-6 font-black text-chart-3 hover:bg-chart-3/20 disabled:opacity-50"
                      title={t.doubleDown}
                    >
                      {t.double}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {resultReason && (
                  <div className="mx-auto mb-4 max-w-sm rounded-2xl border bg-muted/50 p-3 text-left text-xs leading-5 text-muted-foreground">
                    <p>{strategy.results[resultReason]}</p>
                    {actionTrail && <p className="mt-1 font-bold">{strategy.trail}: {actionTrail}</p>}
                  </div>
                )}
                <p className="mb-3 text-xs font-bold text-muted-foreground">
                  {tier} · {t.cards} {Math.max(0, game.player.length - 2)} · {t.remaining} {game.deck.length} · {t.next} {game.outcome === "win" ? Math.max(2, record?.w ?? 1) : 1}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={start} className="min-h-12 rounded-full bg-primary px-8 font-black text-primary-foreground">
                    {t.reset}
                  </button>
                  <button
                    type="button"
                    onClick={handleShareCard}
                    className="min-h-12 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 font-bold text-xs hover:bg-muted"
                  >
                    <Share2 className="size-4" />
                    <span>{shareCardCopied ? t.shareCopied : t.shareCard}</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
        <p className="mt-6 rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {t.rules}{totalGames > 0 ? ` · ${t.record} ${winRate}%` : ""}
        </p>
      </GameContainer>
    </div>
  );
};
export default Blackjack;
