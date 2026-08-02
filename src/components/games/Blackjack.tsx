import { useCallback, useEffect, useRef, useState } from "react";
import { GameContainer, PlayingCard } from "../ui/game/GamePrimitives";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { createBlackjackGame, evaluateBlackjackHand, hitBlackjack, standBlackjack, type BlackjackOutcome, type BlackjackState } from "../../lib/games/blackjack";
import { clearBlackjackSave, loadBlackjackSave, storeBlackjackSave } from "../../lib/games/blackjack-save";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";

const COPY = {
  ko: { title: "블랙잭", subtitle: "S17 클래식 · 확률과 위험", hit: "카드 받기 · H", stand: "멈추기 · S", reset: "새 라운드", score: "합계", win: "승리!", lost: "패배", push: "무승부", dealer: "딜러", player: "나", hidden: "숨은 카드", pause: "일시정지", resume: "계속하기", sound: "소리", restored: "이전 라운드를 일시정지 상태로 복원했습니다", soft: "소프트", hard: "하드", cards: "받은 카드", remaining: "남은 덱", record: "전적", next: "다음 목표", rules: "딜러는 모든 17에서 멈춥니다. 자연 블랙잭을 일반 21보다 먼저 판정합니다." },
  en: { title: "Blackjack", subtitle: "Classic S17 · probability and risk", hit: "Hit · H", stand: "Stand · S", reset: "New round", score: "Total", win: "You win!", lost: "You lost", push: "Push", dealer: "Dealer", player: "You", hidden: "Hidden card", pause: "Pause", resume: "Resume", sound: "Sound", restored: "Previous round restored and paused", soft: "Soft", hard: "Hard", cards: "Cards drawn", remaining: "Deck left", record: "Record", next: "Next target", rules: "Dealer stands on every 17. Natural blackjack is settled before an ordinary 21." },
  ja: { title: "ブラックジャック", subtitle: "クラシックS17 · 確率とリスク", hit: "ヒット · H", stand: "スタンド · S", reset: "新しいラウンド", score: "合計", win: "勝利！", lost: "敗北", push: "引き分け", dealer: "ディーラー", player: "あなた", hidden: "伏せ札", pause: "一時停止", resume: "再開", sound: "サウンド", restored: "前のラウンドを一時停止で復元しました", soft: "ソフト", hard: "ハード", cards: "引いた枚数", remaining: "残り山札", record: "戦績", next: "次の目標", rules: "ディーラーはすべての17でスタンド。ナチュラルを通常の21より先に判定します。" },
  zh: { title: "二十一点", subtitle: "经典S17 · 概率与风险", hit: "要牌 · H", stand: "停牌 · S", reset: "新一局", score: "点数", win: "你赢了！", lost: "你输了", push: "平局", dealer: "庄家", player: "你", hidden: "暗牌", pause: "暂停", resume: "继续", sound: "声音", restored: "已恢复并暂停上一局", soft: "软牌", hard: "硬牌", cards: "要牌数", remaining: "剩余牌", record: "战绩", next: "下个目标", rules: "庄家在所有17点停牌。天然黑杰克优先于普通21点结算。" },
  fr: { title: "Blackjack", subtitle: "S17 classique · probabilité et risque", hit: "Tirer · H", stand: "Rester · S", reset: "Nouvelle manche", score: "Total", win: "Gagné !", lost: "Perdu", push: "Égalité", dealer: "Croupier", player: "Vous", hidden: "Carte cachée", pause: "Pause", resume: "Reprendre", sound: "Son", restored: "Manche précédente restaurée en pause", soft: "Souple", hard: "Dur", cards: "Cartes tirées", remaining: "Paquet restant", record: "Bilan", next: "Prochain objectif", rules: "Le croupier reste sur tous les 17. Un blackjack naturel prime un 21 ordinaire." },
  es: { title: "Blackjack", subtitle: "S17 clásico · probabilidad y riesgo", hit: "Pedir · H", stand: "Plantarse · S", reset: "Nueva ronda", score: "Total", win: "¡Ganaste!", lost: "Perdiste", push: "Empate", dealer: "Crupier", player: "Tú", hidden: "Carta oculta", pause: "Pausa", resume: "Continuar", sound: "Sonido", restored: "Ronda anterior restaurada y pausada", soft: "Suave", hard: "Dura", cards: "Cartas pedidas", remaining: "Mazo restante", record: "Historial", next: "Siguiente meta", rules: "El crupier se planta en todo 17. El blackjack natural se resuelve antes que un 21 normal." },
} as const;

const Blackjack = ({ locale = "ko" }: { locale?: string }) => {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const reducedMotion = usePrefersReducedMotion();
  const [game, setGame] = useState<BlackjackState>(() => createBlackjackGame(1));
  const [paused, setPaused] = useState(false), [restored, setRestored] = useState(false), [muted, setMuted] = useState(false);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const audio = useRef<AudioContext | null>(null), endedSeed = useRef<number | null>(null);

  const tone = useCallback((kind: "card" | BlackjackOutcome) => {
    if (muted || typeof AudioContext === "undefined") return;
    const context = audio.current ?? new AudioContext(); audio.current = context;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.frequency.value = kind === "card" ? 320 : kind === "win" ? 620 : kind === "push" ? 420 : 150;
    oscillator.type = kind === "lost" ? "sawtooth" : "sine"; gain.gain.setValueAtTime(.045, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .11);
    oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .11);
  }, [muted]);
  const start = useCallback(() => {
    clearBlackjackSave(); const seed = typeof crypto !== "undefined" ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now() >>> 0;
    setGame(createBlackjackGame(seed)); setPaused(false); setRestored(false); endedSeed.current = null;
  }, []);
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
  }, [game, tone]);
  const hit = useCallback(() => { if (paused || game.status !== "playing") return; const next = hitBlackjack(game); if (next !== game) { tone("card"); setGame(next); } }, [game, paused, tone]);
  const stand = useCallback(() => { if (paused || game.status !== "playing") return; setGame(standBlackjack(game)); }, [game, paused]);
  useEffect(() => { const keys = (event: KeyboardEvent) => { if (event.key.toLowerCase() === "h") { event.preventDefault(); hit(); } else if (event.key.toLowerCase() === "s") { event.preventDefault(); stand(); } }; window.addEventListener("keydown", keys); return () => window.removeEventListener("keydown", keys); }, [hit, stand]);

  const playerScore = evaluateBlackjackHand(game.player), dealerScore = evaluateBlackjackHand(game.dealer), reveal = game.status === "result";
  const totalGames = record ? record.w + record.l + record.d : 0;
  return <GameContainer title={t.title} subtitle={t.subtitle} onReset={start}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
      <span>{t.record} {record ? `${record.w}–${record.l}–${record.d}` : "0–0–0"}</span>
      <div className="flex gap-2"><button type="button" onClick={() => { setPaused(value => !value); setRestored(false); }} disabled={game.status !== "playing"} className="min-h-11 rounded-xl border px-3">{paused ? `▶ ${t.resume}` : `Ⅱ ${t.pause}`}</button><button type="button" onClick={() => setMuted(value => !value)} aria-pressed={muted} className="min-h-11 rounded-xl border px-3">{muted ? "🔇" : "🔊"} {t.sound}</button></div>
    </div>
    {(paused || restored) && game.status === "playing" && <p role="status" className="mb-4 text-center text-xs font-bold text-muted-foreground">{restored ? t.restored : t.pause}</p>}
    <div className="space-y-7 sm:space-y-10">
      <section className="text-center" aria-label={t.dealer}><p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.dealer} {reveal ? `· ${dealerScore.total} ${dealerScore.soft ? t.soft : t.hard}` : ""}</p><div className="flex min-h-28 justify-center -space-x-9">{game.dealer.map((card, index) => <PlayingCard key={`${card.suit}-${card.value}-${index}`} suit={card.suit} value={card.value} isFaceUp={index === 0 || reveal} className="border-2 border-primary/20 shadow-md" />)}</div></section>
      <div className="min-h-12 text-center" aria-live="assertive">{game.outcome && <div role="status" className={`inline-block rounded-full px-7 py-2 text-lg font-black ${!reducedMotion ? "animate-in zoom-in-95" : ""} ${game.outcome === "win" ? "bg-primary text-primary-foreground" : game.outcome === "lost" ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>{t[game.outcome]}</div>}</div>
      <section className="text-center" aria-label={t.player}><div className="mb-3 flex min-h-28 justify-center -space-x-9">{game.player.map((card, index) => <PlayingCard key={`${card.suit}-${card.value}-${index}`} suit={card.suit} value={card.value} className="border-2 border-primary shadow-md" />)}</div><p className="mb-4 text-xs font-black uppercase tracking-widest text-primary">{t.player} · {t.score} {playerScore.total} · {playerScore.soft ? t.soft : t.hard}</p>
        {game.status === "playing" ? <div className="flex flex-wrap justify-center gap-3"><button type="button" onClick={hit} disabled={paused} className="min-h-12 rounded-full bg-primary px-7 font-black text-primary-foreground disabled:opacity-50">{t.hit}</button><button type="button" onClick={stand} disabled={paused} className="min-h-12 rounded-full border bg-muted px-7 font-black disabled:opacity-50">{t.stand}</button></div> : <div><p className="mb-3 text-xs font-bold text-muted-foreground">{t.cards} {Math.max(0, game.player.length - 2)} · {t.remaining} {game.deck.length} · {t.next} {game.outcome === "win" ? Math.max(2, record?.w ?? 1) : 1}</p><button type="button" onClick={start} className="min-h-12 rounded-full bg-primary px-8 font-black text-primary-foreground">{t.reset}</button></div>}
      </section>
    </div>
    <p className="mt-6 rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">{t.rules}{totalGames > 0 ? ` · ${t.record} ${Math.round((record?.w ?? 0) / totalGames * 100)}%` : ""}</p>
  </GameContainer>;
};
export default Blackjack;
