import { useCallback, useEffect, useRef, useState } from "react";
import { GameContainer, PlayingCard } from "../ui/game/GamePrimitives";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { blackjackAdvice, blackjackResultReason, createBlackjackGame, evaluateBlackjackHand, hitBlackjack, standBlackjack, type BlackjackAdviceReason, type BlackjackOutcome, type BlackjackResultReason, type BlackjackState } from "../../lib/games/blackjack";
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

const STRATEGY_COPY: Record<string, { guide: string; hit: string; stand: string; trail: string; reasons: Record<BlackjackAdviceReason, string>; results: Record<BlackjackResultReason, string> }> = {
  ko: { guide: "현재 수 참고", hit: "받기", stand: "멈추기", trail: "선택", reasons: { "low-total": "합계가 낮아 한 장을 더 받아도 버스트 위험이 작습니다.", "dealer-weak": "딜러의 공개 카드가 약합니다. 먼저 버스트할 가능성을 기다립니다.", "dealer-strong": "딜러 공개 카드가 강합니다. 현재 합계로는 한 장을 더 보는 쪽입니다.", "soft-flex": "에이스를 1로 바꿀 수 있어 한 장을 더 받을 여지가 있습니다.", "safe-total": "현재 합계가 충분히 높습니다. 더 받으면 버스트 위험이 커집니다." }, results: { natural: "두 장으로 만든 21, 또는 딜러의 내추럴로 바로 결론 났습니다.", "player-bust": "내 합계가 21을 넘었습니다.", "dealer-bust": "딜러 합계가 21을 넘었습니다.", higher: "21 이하에서 내 합계가 더 높았습니다.", lower: "21 이하에서 딜러 합계가 더 높았습니다.", equal: "두 합계가 같았습니다." } },
  en: { guide: "Current-hand guide", hit: "Hit", stand: "Stand", trail: "Choices", reasons: { "low-total": "The total is low enough that another card carries limited bust risk.", "dealer-weak": "The dealer shows a weak card. Stand and make the dealer complete the hand.", "dealer-strong": "The dealer shows a strong card. This total usually needs another card.", "soft-flex": "The ace can fall from 11 to 1, leaving room for another card.", "safe-total": "The total is strong enough; another card adds too much bust risk." }, results: { natural: "A two-card 21, or the dealer’s natural, settled the round immediately.", "player-bust": "Your total went over 21.", "dealer-bust": "The dealer went over 21.", higher: "Your total was higher without exceeding 21.", lower: "The dealer’s total was higher without exceeding 21.", equal: "Both totals were equal." } },
  ja: { guide: "現在の手の参考", hit: "ヒット", stand: "スタンド", trail: "選択", reasons: { "low-total": "合計が低く、もう1枚引いてもバーストの危険が小さい局面です。", "dealer-weak": "ディーラーの公開札が弱いため、スタンドして完成を待ちます。", "dealer-strong": "ディーラーの公開札が強く、この合計ではもう1枚見る局面です。", "soft-flex": "エースを1に下げられるため、もう1枚引く余地があります。", "safe-total": "十分高い合計で、追加カードのバースト危険が大きい局面です。" }, results: { natural: "2枚の21、またはディーラーのナチュラルで即決しました。", "player-bust": "あなたの合計が21を超えました。", "dealer-bust": "ディーラーが21を超えました。", higher: "21以下であなたの合計が上でした。", lower: "21以下でディーラーの合計が上でした。", equal: "両者の合計が同じでした。" } },
  zh: { guide: "当前手牌参考", hit: "要牌", stand: "停牌", trail: "选择", reasons: { "low-total": "点数较低，再拿一张的爆牌风险较小。", "dealer-weak": "庄家明牌较弱，停牌等待庄家完成手牌。", "dealer-strong": "庄家明牌较强，当前点数通常需要再看一张。", "soft-flex": "A可以从11降为1，还有再拿一张的空间。", "safe-total": "当前点数已经较高，再拿一张的爆牌风险更大。" }, results: { natural: "两张牌21点，或庄家天然黑杰克，直接结算。", "player-bust": "你的点数超过21。", "dealer-bust": "庄家点数超过21。", higher: "未超过21时，你的点数更高。", lower: "未超过21时，庄家点数更高。", equal: "双方点数相同。" } },
  fr: { guide: "Repère pour la main", hit: "Tirer", stand: "Rester", trail: "Choix", reasons: { "low-total": "Le total est bas et le risque de dépasser reste limité.", "dealer-weak": "La carte visible du croupier est faible. Restez et laissez-le finir.", "dealer-strong": "La carte visible est forte; ce total demande généralement une carte.", "soft-flex": "L’as peut passer de 11 à 1, laissant de la marge pour tirer.", "safe-total": "Le total est assez fort; tirer augmente trop le risque de dépasser." }, results: { natural: "Un 21 en deux cartes, ou le naturel du croupier, a réglé la manche.", "player-bust": "Votre total a dépassé 21.", "dealer-bust": "Le croupier a dépassé 21.", higher: "Votre total était supérieur sans dépasser 21.", lower: "Le total du croupier était supérieur sans dépasser 21.", equal: "Les deux totaux étaient égaux." } },
  es: { guide: "Guía de la mano", hit: "Pedir", stand: "Plantarse", trail: "Decisiones", reasons: { "low-total": "El total es bajo y otra carta tiene poco riesgo de pasarse.", "dealer-weak": "La carta visible del crupier es débil. Plántate y deja que complete la mano.", "dealer-strong": "La carta visible es fuerte; este total suele necesitar otra carta.", "soft-flex": "El as puede bajar de 11 a 1, dejando margen para otra carta.", "safe-total": "El total ya es fuerte; otra carta aumenta demasiado el riesgo." }, results: { natural: "Un 21 de dos cartas, o el natural del crupier, cerró la ronda.", "player-bust": "Tu total superó 21.", "dealer-bust": "El crupier superó 21.", higher: "Tu total fue mayor sin superar 21.", lower: "El total del crupier fue mayor sin superar 21.", equal: "Los dos totales fueron iguales." } },
};

const Blackjack = ({ locale = "ko" }: { locale?: string }) => {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const strategy = STRATEGY_COPY[locale] ?? STRATEGY_COPY.en;
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
  const advice = game.status === "playing" ? blackjackAdvice(game.player, game.dealer[0]) : null;
  const resultReason = blackjackResultReason(game);
  const actionTrail = game.actions.map(action => action === "hit" ? strategy.hit : strategy.stand).join(" → ");
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
      <section className="text-center" aria-label={t.player}>
        <div className="mb-3 flex min-h-28 justify-center -space-x-9">{game.player.map((card, index) => <PlayingCard key={`${card.suit}-${card.value}-${index}`} suit={card.suit} value={card.value} className="border-2 border-primary shadow-md" />)}</div>
        <p className="mb-4 text-xs font-black uppercase tracking-widest text-primary">{t.player} · {t.score} {playerScore.total} · {playerScore.soft ? t.soft : t.hard}</p>
        {game.status === "playing" ? (
          <div>
            {advice && <div className="mx-auto mb-4 max-w-sm rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-left text-xs text-stone-800"><p className="font-black text-amber-900">{strategy.guide}: {advice.action === "hit" ? strategy.hit : strategy.stand}</p><p className="mt-1 leading-5">{strategy.reasons[advice.reason]}</p></div>}
            <div className="flex flex-wrap justify-center gap-3"><button type="button" onClick={hit} disabled={paused} className="min-h-12 rounded-full bg-primary px-7 font-black text-primary-foreground disabled:opacity-50">{t.hit}</button><button type="button" onClick={stand} disabled={paused} className="min-h-12 rounded-full border bg-muted px-7 font-black disabled:opacity-50">{t.stand}</button></div>
          </div>
        ) : (
          <div>
            {resultReason && <div className="mx-auto mb-4 max-w-sm rounded-2xl border bg-muted/50 p-3 text-left text-xs leading-5 text-muted-foreground"><p>{strategy.results[resultReason]}</p>{actionTrail && <p className="mt-1 font-bold">{strategy.trail}: {actionTrail}</p>}</div>}
            <p className="mb-3 text-xs font-bold text-muted-foreground">{t.cards} {Math.max(0, game.player.length - 2)} · {t.remaining} {game.deck.length} · {t.next} {game.outcome === "win" ? Math.max(2, record?.w ?? 1) : 1}</p>
            <button type="button" onClick={start} className="min-h-12 rounded-full bg-primary px-8 font-black text-primary-foreground">{t.reset}</button>
          </div>
        )}
      </section>
    </div>
    <p className="mt-6 rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">{t.rules}{totalGames > 0 ? ` · ${t.record} ${Math.round((record?.w ?? 0) / totalGames * 100)}%` : ""}</p>
  </GameContainer>;
};
export default Blackjack;
