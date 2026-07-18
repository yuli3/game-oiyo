import React, { useCallback, useMemo, useState } from "react";
import { PlayingCard, GameContainer } from "../ui/game/GamePrimitives";
import { getRecord, recordResult } from "../../lib/games/records";
import {
  compareHands,
  evaluateBest,
  makeDeck,
  shuffleDeck,
  type Card,
  type HandCategory,
} from "../../lib/games/poker";

type UILocale = "ko" | "en" | "ja" | "zh" | "fr" | "es";
type Stage = "idle" | "preflop" | "flop" | "turn" | "river" | "showdown";
const GAME_ID = "texas-holdem";

// Community cards revealed at each stage.
const REVEAL: Record<Stage, number> = { idle: 0, preflop: 0, flop: 3, turn: 4, river: 5, showdown: 5 };

const RANK_LABEL: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
const rankLabel = (r: number) => RANK_LABEL[r] ?? String(r);

const CATEGORY_LABEL: Record<UILocale, Record<HandCategory, string>> = {
  ko: { "straight-flush": "스트레이트 플러시", "four-of-a-kind": "포카드", "full-house": "풀하우스", flush: "플러시", straight: "스트레이트", "three-of-a-kind": "트리플", "two-pair": "투페어", "one-pair": "원페어", "high-card": "하이카드" },
  en: { "straight-flush": "Straight flush", "four-of-a-kind": "Four of a kind", "full-house": "Full house", flush: "Flush", straight: "Straight", "three-of-a-kind": "Three of a kind", "two-pair": "Two pair", "one-pair": "One pair", "high-card": "High card" },
  ja: { "straight-flush": "ストレートフラッシュ", "four-of-a-kind": "フォーカード", "full-house": "フルハウス", flush: "フラッシュ", straight: "ストレート", "three-of-a-kind": "スリーカード", "two-pair": "ツーペア", "one-pair": "ワンペア", "high-card": "ハイカード" },
  zh: { "straight-flush": "同花顺", "four-of-a-kind": "四条", "full-house": "葫芦", flush: "同花", straight: "顺子", "three-of-a-kind": "三条", "two-pair": "两对", "one-pair": "一对", "high-card": "高牌" },
  fr: { "straight-flush": "Quinte flush", "four-of-a-kind": "Carré", "full-house": "Full", flush: "Couleur", straight: "Quinte", "three-of-a-kind": "Brelan", "two-pair": "Deux paires", "one-pair": "Paire", "high-card": "Carte haute" },
  es: { "straight-flush": "Escalera de color", "four-of-a-kind": "Póker", "full-house": "Full", flush: "Color", straight: "Escalera", "three-of-a-kind": "Trío", "two-pair": "Doble pareja", "one-pair": "Pareja", "high-card": "Carta alta" },
};

// Category order for the reference list (strong → weak).
const CATEGORY_SEQ: HandCategory[] = ["straight-flush", "four-of-a-kind", "full-house", "flush", "straight", "three-of-a-kind", "two-pair", "one-pair", "high-card"];

const COPY: Record<UILocale, {
  title: string; subtitle: string;
  deal: string; next: string[]; fold: string; showdown: string; again: string;
  you: string; opponent: string; community: string; current: string; folded: string;
  win: string; lose: string; tie: string; foldLose: string;
  ranks: string; stats: (w: number, l: number, d: number) => string;
  note: string;
}> = {
  ko: {
    title: "텍사스 홀덤", subtitle: "무료 교육용 · 베팅 없이 족보와 승패를 배우는 헤드업 포커",
    deal: "딜", next: ["플랍 보기", "턴 보기", "리버 보기"], fold: "폴드", showdown: "쇼다운", again: "다음 판",
    you: "나", opponent: "상대", community: "커뮤니티 카드", current: "현재 최선", folded: "폴드함",
    win: "🎉 승리!", lose: "패배", tie: "무승부 (분할)", foldLose: "폴드 — 상대 승",
    ranks: "포커 족보 (강→약)", stats: (w, l, d) => `${w}승 ${l}패 ${d}무`,
    note: "실제 화폐·베팅 없는 학습용 게임입니다. 두 장의 핸드와 커뮤니티 5장으로 가장 강한 5장을 만듭니다. 다음 카드를 보는 비용은 없으며, 폴드는 자기 판단을 확인하는 연습 버튼입니다.",
  },
  en: {
    title: "Texas Hold'em", subtitle: "Free educational heads-up poker — learn hand rankings and showdowns, no betting",
    deal: "Deal", next: ["See flop", "See turn", "See river"], fold: "Fold", showdown: "Showdown", again: "Next hand",
    you: "You", opponent: "Opponent", community: "Community cards", current: "Best so far", folded: "Folded",
    win: "🎉 You win!", lose: "You lose", tie: "Split pot", foldLose: "Folded — opponent wins",
    ranks: "Poker hand rankings (strong → weak)", stats: (w, l, d) => `${w}W ${l}L ${d}D`,
    note: "A learning game with no real money or betting. Make the best 5-card hand from your 2 cards plus 5 community cards. Revealing the next card costs nothing; Fold is only a self-check.",
  },
  ja: {
    title: "テキサスホールデム", subtitle: "無料の学習用ヘッズアップポーカー — 役と勝敗を学ぶ（ベットなし）",
    deal: "ディール", next: ["フロップを見る", "ターンを見る", "リバーを見る"], fold: "フォールド", showdown: "ショーダウン", again: "次のハンド",
    you: "あなた", opponent: "相手", community: "コミュニティカード", current: "現在の最善", folded: "フォールド",
    win: "🎉 勝ち！", lose: "負け", tie: "引き分け（分割）", foldLose: "フォールド — 相手の勝ち",
    ranks: "ポーカーの役（強→弱）", stats: (w, l, d) => `${w}勝 ${l}敗 ${d}分`,
    note: "実際のお金やベットのない学習用ゲームです。手札2枚とコミュニティ5枚で最強の5枚を作ります。次のカードを見る費用はなく、フォールドは自己判断を確認する練習用です。",
  },
  zh: {
    title: "德州扑克", subtitle: "免费教学单挑扑克 — 学习牌型与比牌，无下注",
    deal: "发牌", next: ["看翻牌", "看转牌", "看河牌"], fold: "弃牌", showdown: "摊牌", again: "下一手",
    you: "你", opponent: "对手", community: "公共牌", current: "当前最佳", folded: "已弃牌",
    win: "🎉 你赢了！", lose: "你输了", tie: "平局（分池）", foldLose: "弃牌 — 对手获胜",
    ranks: "扑克牌型（强→弱）", stats: (w, l, d) => `${w}胜 ${l}负 ${d}平`,
    note: "这是一款无真实货币和下注的学习游戏。用你的2张牌加5张公共牌组成最强的5张牌。查看下一张牌没有成本；弃牌只是自我判断练习。",
  },
  fr: {
    title: "Texas Hold'em", subtitle: "Poker éducatif gratuit en tête-à-tête — apprenez les mains et les abattages, sans mise",
    deal: "Distribuer", next: ["Voir le flop", "Voir le turn", "Voir la river"], fold: "Se coucher", showdown: "Abattage", again: "Main suivante",
    you: "Vous", opponent: "Adversaire", community: "Cartes communes", current: "Meilleure main", folded: "Couché",
    win: "🎉 Gagné !", lose: "Perdu", tie: "Split (partage)", foldLose: "Couché — l'adversaire gagne",
    ranks: "Classement des mains (fort → faible)", stats: (w, l, d) => `${w}V ${l}D ${d}N`,
    note: "Jeu d'apprentissage sans argent réel ni mise. Composez la meilleure main de 5 cartes avec vos 2 cartes et les 5 cartes communes. Révéler la carte suivante ne coûte rien ; se coucher est seulement un auto-test.",
  },
  es: {
    title: "Texas Hold'em", subtitle: "Póker educativo gratis cara a cara — aprende las manos y los enfrentamientos, sin apuestas",
    deal: "Repartir", next: ["Ver flop", "Ver turn", "Ver river"], fold: "Retirarse", showdown: "Enfrentamiento", again: "Siguiente mano",
    you: "Tú", opponent: "Rival", community: "Cartas comunitarias", current: "Mejor mano", folded: "Retirado",
    win: "🎉 ¡Ganaste!", lose: "Perdiste", tie: "Empate (reparto)", foldLose: "Retirado — gana el rival",
    ranks: "Ranking de manos (fuerte → débil)", stats: (w, l, d) => `${w}G ${l}P ${d}E`,
    note: "Un juego de aprendizaje sin dinero real ni apuestas. Forma la mejor mano de 5 cartas con tus 2 cartas y las 5 comunitarias. Ver la siguiente carta no cuesta nada; retirarse es solo una autoevaluación.",
  },
};

const Hand: React.FC<{ cards: Card[]; hidden?: boolean; highlight?: Set<string> }> = ({ cards, hidden, highlight }) => (
  <div className="flex gap-1.5 sm:gap-2 flex-wrap">
    {cards.map((c, i) => {
      const key = `${c.rank}${c.suit}`;
      const dim = highlight && !highlight.has(key);
      return (
        <div key={i} className={dim ? "opacity-35 transition-opacity" : "transition-opacity"}>
          <PlayingCard suit={c.suit} value={rankLabel(c.rank)} isFaceUp={!hidden} />
        </div>
      );
    })}
  </div>
);

const TexasHoldem: React.FC<{ locale?: UILocale }> = ({ locale = "ko" }) => {
  const t = COPY[locale] ?? COPY.en;
  const catLabel = CATEGORY_LABEL[locale] ?? CATEGORY_LABEL.en;

  const [deck, setDeck] = useState<Card[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [folded, setFolded] = useState(false);
  const [rec, setRec] = useState(() => getRecord(GAME_ID));
  const [showRanks, setShowRanks] = useState(false);

  // Fixed seats in the shuffled deck: [p0, a0, p1, a1, c0..c4].
  const player = useMemo(() => (deck.length ? [deck[0], deck[2]] : []), [deck]);
  const ai = useMemo(() => (deck.length ? [deck[1], deck[3]] : []), [deck]);
  const board = useMemo(() => (deck.length ? deck.slice(4, 9) : []), [deck]);
  const shownBoard = board.slice(0, REVEAL[stage]);

  const deal = useCallback(() => {
    setDeck(shuffleDeck(makeDeck(), (Date.now() ^ (Math.random() * 1e9)) >>> 0));
    setStage("preflop");
    setFolded(false);
  }, []);

  const advance = useCallback(() => {
    setStage((s) => (s === "preflop" ? "flop" : s === "flop" ? "turn" : s === "turn" ? "river" : "showdown"));
  }, []);

  const fold = useCallback(() => {
    setFolded(true);
    setStage("showdown");
    setRec(recordResult(GAME_ID, "l"));
  }, []);

  // Current best hand for the player from what's visible (educational hint).
  const currentBest = useMemo(() => {
    const seen = [...player, ...shownBoard];
    return seen.length >= 5 ? evaluateBest(seen) : null;
  }, [player, shownBoard]);

  // Showdown resolution (only when reaching the river without folding).
  const result = useMemo(() => {
    if (stage !== "showdown" || folded) return null;
    const pv = evaluateBest([...player, ...board]);
    const av = evaluateBest([...ai, ...board]);
    const cmp = compareHands(pv, av);
    return { pv, av, outcome: cmp > 0 ? "win" : cmp < 0 ? "lose" : "tie" as "win" | "lose" | "tie" };
  }, [stage, folded, player, ai, board]);

  // Record win/lose/tie exactly once when the showdown resolves.
  const [recorded, setRecorded] = useState(false);
  React.useEffect(() => {
    if (result && !recorded && !folded) {
      setRecorded(true);
      setRec(recordResult(GAME_ID, result.outcome === "win" ? "w" : result.outcome === "lose" ? "l" : "d"));
    }
    if (stage === "preflop") setRecorded(false);
  }, [result, recorded, folded, stage]);

  const highlight = result ? new Set(result.pv.best5.map((c) => `${c.rank}${c.suit}`)) : undefined;
  const over = stage === "showdown";

  return (
    <GameContainer title={t.title} subtitle={t.subtitle} onReset={stage !== "idle" ? deal : undefined} resetLabel={t.again}>
      {stage === "idle" ? (
        <div className="flex flex-col items-center gap-6 py-10">
          <button onClick={deal} className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-lg hover:bg-primary/90 transition-colors">
            {t.deal}
          </button>
          <p className="text-xs text-muted-foreground text-center max-w-md leading-relaxed">{t.note}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Opponent */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t.opponent}</span>
            <Hand cards={ai} hidden={!over} highlight={over && result ? new Set(result.av.best5.map((c) => `${c.rank}${c.suit}`)) : undefined} />
            {over && result && <span className="text-xs font-bold">{catLabel[result.av.category]}</span>}
          </div>

          {/* Community */}
          <div className="flex flex-col items-center gap-1.5 border-y border-border py-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t.community}</span>
            <div className="flex gap-1.5 sm:gap-2 min-h-[128px] items-center">
              {shownBoard.length ? <Hand cards={shownBoard} highlight={highlight} /> : <span className="text-xs text-muted-foreground">— {t.next[0]} —</span>}
            </div>
          </div>

          {/* Player */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t.you}</span>
            <Hand cards={player} highlight={highlight} />
            {currentBest && !over && (
              <span className="text-xs text-muted-foreground">{t.current}: <b className="text-foreground">{catLabel[currentBest.category]}</b></span>
            )}
          </div>

          {/* Result / controls */}
          {over ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-lg font-black">
                {folded ? t.foldLose : result?.outcome === "win" ? t.win : result?.outcome === "lose" ? t.lose : t.tie}
              </p>
              {!folded && result && (
                <p className="text-xs text-muted-foreground">
                  {t.you}: <b className="text-foreground">{catLabel[result.pv.category]}</b> · {t.opponent}: <b className="text-foreground">{catLabel[result.av.category]}</b>
                </p>
              )}
              <button onClick={deal} className="min-h-11 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-colors">{t.again}</button>
            </div>
          ) : (
            <div className="flex justify-center gap-3">
              <button onClick={fold} className="min-h-11 px-5 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-colors">{t.fold}</button>
              <button onClick={advance} className="min-h-11 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-colors">
                {stage === "river" ? t.showdown : t.next[stage === "preflop" ? 0 : stage === "flop" ? 1 : 2]}
              </button>
            </div>
          )}

          {/* Stats */}
          <p className="text-center text-[11px] font-bold text-muted-foreground">{t.stats(rec.w, rec.l, rec.d)}</p>

          {/* Hand-ranking reference (the teaching artifact) */}
          <div className="border-t border-border pt-3">
            <button onClick={() => setShowRanks((v) => !v)} className="min-h-11 w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>{t.ranks}</span><span>{showRanks ? "▾" : "▸"}</span>
            </button>
            {showRanks && (
              <ol className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                {CATEGORY_SEQ.map((c, i) => (
                  <li key={c} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
                    <span className="w-4 text-muted-foreground tabular-nums">{i + 1}</span>
                    <b>{catLabel[c]}</b>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </GameContainer>
  );
};

export default TexasHoldem;
