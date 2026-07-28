import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";
import {
  buildWall, shuffle, isWinningHand, aiDiscard, rankOf, suitOf, isHonor,
  nextRonCandidate, ronCandidatesInSeatOrder,
  type AiLevel,
} from "../../lib/games/ai/mahjong";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";

const AI_DELAY = 700;
const HAND = 13;

type Phase = "draw" | "discard" | "ron" | "over";
interface GameT {
  hands: number[][];        // [you, ai1, ai2, ai3]
  discards: number[][];
  wall: number[];
  wallPos: number;
  turn: number;             // 0..3
  drawn: number | null;     // last tile drawn by current player
  phase: Phase;
  lastDiscard: number | null;
  lastDiscarder: number | null;
  winner: number | null;    // 0..3, or -1 exhaustive draw
  winType: "tsumo" | "ron" | null;
  ronTile: number | null;   // tile the human may ron on
}

const i18n: Record<Locale, {
  title: string; you: string; ai: string; wall: string; discard: string; tsumo: string; ron: string;
  pass: string; yourHand: string; draws: string; thinking: string; reset: string; start: string;
  youWin: string; aiWin: string; exhaust: string; record: string; level1: string; level2: string; level3: string;
  byTsumo: string; byRon: string; rules: string;
}> = {
  ko: { title: "마작 (간이)", you: "나", ai: "AI", wall: "패산", discard: "버림패", tsumo: "쯔모!", ron: "론!", pass: "패스", yourHand: "내 손패", draws: "장 남음", thinking: "AI 차례…", reset: "새 판", start: "게임 시작", youWin: "당신의 승리!", aiWin: "의 화료", exhaust: "유국 (무승부)", record: "전적", level1: "견습생", level2: "숙련가", level3: "명인", byTsumo: "쯔모", byRon: "론", rules: "폐형(멍패)만 · 4멘츠+1아타마 또는 치또이쯔로 화료" },
  en: { title: "Mahjong (Simple)", you: "You", ai: "AI", wall: "Wall", discard: "Discards", tsumo: "Tsumo!", ron: "Ron!", pass: "Pass", yourHand: "Your hand", draws: "left", thinking: "AI's turn…", reset: "New Game", start: "Start Game", youWin: "You win!", aiWin: " wins", exhaust: "Exhaustive draw", record: "Record", level1: "Apprentice", level2: "Adept", level3: "Master", byTsumo: "Tsumo", byRon: "Ron", rules: "Closed hands only · win with 4 melds + a pair, or seven pairs" },
  ja: { title: "麻雀（簡易）", you: "あなた", ai: "AI", wall: "牌山", discard: "捨て牌", tsumo: "ツモ！", ron: "ロン！", pass: "パス", yourHand: "手牌", draws: "枚", thinking: "AIの番…", reset: "新しい局", start: "ゲーム開始", youWin: "あなたの和了！", aiWin: "の和了", exhaust: "流局", record: "戦績", level1: "見習い", level2: "熟練者", level3: "名人", byTsumo: "ツモ", byRon: "ロン", rules: "門前のみ・4面子1雀頭か七対子で和了" },
  zh: { title: "麻将（简易）", you: "你", ai: "AI", wall: "牌山", discard: "弃牌", tsumo: "自摸！", ron: "荣和！", pass: "过", yourHand: "手牌", draws: "张", thinking: "AI 回合…", reset: "新对局", start: "开始游戏", youWin: "你和了！", aiWin: " 和了", exhaust: "荒庄（平局）", record: "战绩", level1: "学徒", level2: "行家", level3: "大师", byTsumo: "自摸", byRon: "荣和", rules: "仅门清 · 四面子一雀头或七对子和牌" },
  fr: { title: "Mahjong (simple)", you: "Vous", ai: "IA", wall: "Mur", discard: "Défausses", tsumo: "Tsumo !", ron: "Ron !", pass: "Passer", yourHand: "Votre main", draws: "restantes", thinking: "Tour de l'IA…", reset: "Nouvelle partie", start: "Commencer", youWin: "Vous gagnez !", aiWin: " gagne", exhaust: "Mur épuisé (nul)", record: "Bilan", level1: "Apprenti", level2: "Adepte", level3: "Maître", byTsumo: "Tsumo", byRon: "Ron", rules: "Mains fermées · 4 combinaisons + une paire, ou sept paires" },
  es: { title: "Mahjong (simple)", you: "Tú", ai: "IA", wall: "Muro", discard: "Descartes", tsumo: "¡Tsumo!", ron: "¡Ron!", pass: "Pasar", yourHand: "Tu mano", draws: "restantes", thinking: "Turno de la IA…", reset: "Nueva partida", start: "Empezar", youWin: "¡Has ganado!", aiWin: " gana", exhaust: "Muro agotado (empate)", record: "Historial", level1: "Aprendiz", level2: "Experto", level3: "Maestro", byTsumo: "Tsumo", byRon: "Ron", rules: "Manos cerradas · 4 grupos + una pareja, o siete parejas" },
};

const SUIT_GLYPH = ["m", "p", "s"];
const SUIT_COLOR = ["#b91c1c", "#1d4ed8", "#15803d", "#4b5563"];
const HONOR_LABEL = ["東", "南", "西", "北", "白", "發", "中"];

function tileLabel(k: number): { text: string; color: string } {
  if (isHonor(k)) return { text: HONOR_LABEL[k - 27], color: k >= 31 ? "#111827" : "#4b5563" };
  return { text: `${rankOf(k)}${SUIT_GLYPH[suitOf(k)]}`, color: SUIT_COLOR[suitOf(k)] };
}

function Tile({ k, onClick, dim, small, ariaLabel, reducedMotion }: { k: number; onClick?: () => void; dim?: boolean; small?: boolean; ariaLabel?: string; reducedMotion?: boolean }) {
  const { text, color } = tileLabel(k);
  const className = `inline-flex items-center justify-center rounded-md border bg-card font-black shadow-sm ${!reducedMotion ? "transition-transform" : ""} ${
    small ? "w-6 h-8 text-[11px]" : "w-8 h-11 text-sm"
  } ${onClick ? `${!reducedMotion ? "hover:-translate-y-1" : ""} border-primary cursor-pointer` : "border-border"} ${dim ? "opacity-40" : ""}`;
  if (!onClick) {
    return <span aria-label={ariaLabel} className={className} style={{ color }}>{text}</span>;
  }
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel}
      className={className}
      style={{ color }}>
      {text}
    </button>
  );
}
function TileBack({ small }: { small?: boolean }) {
  return <div className={`inline-block rounded-md bg-emerald-800 border border-emerald-900 ${small ? "w-5 h-7" : "w-6 h-9"}`} />;
}

const sortHand = (h: number[]) => h.slice().sort((a, b) => a - b);

const Mahjong: React.FC<{ locale?: Locale }> = ({ locale = "ko" }) => {
  const t = i18n[locale] ?? i18n.en;
  const reducedMotion = usePrefersReducedMotion();
  const [level, setLevel] = useState<AiLevel>(2);
  const [started, setStarted] = useState(false);
  const g = useRef<GameT | null>(null);
  const [, force] = useReducer((x) => x + 1, 0);
  const [record, setRecord] = useState<GameRecord>({ w: 0, l: 0, d: 0 });
  const recorded = useRef(false);

  useEffect(() => { setRecord(getRecord("mahjong")); }, []);

  const finish = useCallback((winner: number, type: "tsumo" | "ron" | null) => {
    const s = g.current!;
    s.winner = winner; s.winType = type; s.phase = "over";
    if (!recorded.current) {
      recorded.current = true;
      const r = winner === 0 ? "w" : winner === -1 ? "d" : "l";
      setRecord(recordResult("mahjong", r as "w" | "l" | "d"));
    }
  }, []);

  const newGame = useCallback(() => {
    const wall = shuffle(buildWall());
    const hands = [0, 1, 2, 3].map((i) => sortHand(wall.slice(i * HAND, i * HAND + HAND)));
    g.current = {
      hands, discards: [[], [], [], []], wall, wallPos: 4 * HAND,
      turn: 0, drawn: null, phase: "draw",
      lastDiscard: null, lastDiscarder: null, winner: null, winType: null, ronTile: null,
    };
    recorded.current = false;
    setStarted(true);
    force();
  }, []);

  // Draw a tile for the current player.
  const doDraw = useCallback(() => {
    const s = g.current!;
    if (s.wallPos >= s.wall.length) { finish(-1, null); force(); return; } // exhaustive draw
    const tile = s.wall[s.wallPos++];
    s.hands[s.turn] = [...s.hands[s.turn], tile];
    s.drawn = tile;
    // Winning on draw?
    if (isWinningHand(s.hands[s.turn])) {
      if (s.turn === 0) { s.phase = "discard"; force(); return; } // offer Tsumo button + allow discard
      finish(s.turn, "tsumo"); force(); return;
    }
    s.phase = "discard";
    force();
  }, [finish]);

  const afterDiscard = useCallback((discarder: number, tile: number) => {
    const s = g.current!;
    s.hands[discarder] = sortHand(s.hands[discarder]);
    s.discards[discarder] = [...s.discards[discarder], tile];
    s.lastDiscard = tile;
    s.lastDiscarder = discarder;
    s.drawn = null;
    // Ron check for the other players, in seat order starting after discarder.
    const ronWinner = nextRonCandidate(ronCandidatesInSeatOrder(s.hands, discarder, tile));
    if (ronWinner === 0) { s.phase = "ron"; s.ronTile = tile; force(); return; } // offer human Ron
    if (ronWinner != null) { finish(ronWinner, "ron"); force(); return; }
    // No ron → next player's turn.
    s.turn = (discarder + 1) % 4;
    s.phase = "draw";
    force();
  }, [finish]);

  const humanDiscard = (tile: number) => {
    const s = g.current;
    if (!s || s.phase !== "discard" || s.turn !== 0) return;
    const idx = s.hands[0].indexOf(tile);
    if (idx < 0) return;
    s.hands[0] = [...s.hands[0].slice(0, idx), ...s.hands[0].slice(idx + 1)];
    afterDiscard(0, tile);
  };
  const humanTsumo = () => {
    const s = g.current;
    if (s && s.phase === "discard" && s.turn === 0 && isWinningHand(s.hands[0])) { finish(0, "tsumo"); force(); }
  };
  const humanRon = () => {
    const s = g.current;
    if (s && s.phase === "ron" && s.ronTile != null) { finish(0, "ron"); force(); }
  };
  const humanPassRon = () => {
    const s = g.current;
    if (!s || s.phase !== "ron") return;
    s.ronTile = null;
    const discardTile = s.lastDiscard;
    const discarder = s.lastDiscarder;
    if (discardTile != null && discarder != null) {
      const nextWinner = nextRonCandidate(
        ronCandidatesInSeatOrder(s.hands, discarder, discardTile),
        [0],
      );
      if (nextWinner != null) { finish(nextWinner, "ron"); force(); return; }
    }
    // Resume normal play from the player after whoever discarded the ron tile.
    s.turn = ((s.lastDiscarder ?? 0) + 1) % 4;
    s.phase = "draw";
    force();
  };

  // AI / auto stepping.
  useEffect(() => {
    const s = g.current;
    if (!s || !started || s.phase === "over") return;
    if (s.phase === "draw") {
      const id = setTimeout(() => doDraw(), s.turn === 0 ? 120 : AI_DELAY);
      return () => clearTimeout(id);
    }
    if (s.phase === "discard" && s.turn !== 0) {
      const id = setTimeout(() => {
        const tile = aiDiscard(s.hands[s.turn], level);
        const idx = s.hands[s.turn].indexOf(tile);
        s.hands[s.turn] = [...s.hands[s.turn].slice(0, idx), ...s.hands[s.turn].slice(idx + 1)];
        afterDiscard(s.turn, tile);
      }, AI_DELAY);
      return () => clearTimeout(id);
    }
  });

  if (!started || !g.current) {
    return (
      <GameContainer title={t.title}>
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-xs text-gray-500 max-w-md text-center">{t.rules}</p>
          <div className="flex gap-2">
            {([1, 2, 3] as AiLevel[]).map((lv) => (
              <button type="button" key={lv} onClick={() => setLevel(lv)} aria-pressed={level === lv}
                className={`px-3 py-1.5 rounded-md text-sm font-bold border ${level === lv ? "bg-primary text-primary-foreground border-primary" : "border-gray-300 text-gray-600"}`}>
                {lv === 1 ? t.level1 : lv === 2 ? t.level2 : t.level3}
              </button>
            ))}
          </div>
          <button type="button" onClick={newGame} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold">{t.start}</button>
          <p className="text-xs text-gray-400">{t.record}: {record.w}W {record.l}L {record.d}D</p>
        </div>
      </GameContainer>
    );
  }

  const s = g.current;
  const over = s.phase === "over";
  const yourTurn = s.turn === 0 && s.phase === "discard";
  const canTsumo = yourTurn && isWinningHand(s.hands[0]);
  const drawsLeft = s.wall.length - s.wallPos;

  return (
    <GameContainer title={t.title} subtitle={`${t.wall}: ${drawsLeft} ${t.draws}`} onReset={newGame}>
      <div className="flex flex-col gap-3">
        {/* AI seats */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((pl) => (
            <div key={pl} className={`rounded-lg border p-2 ${s.turn === pl && !over ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="text-[10px] font-bold text-muted-foreground mb-1">{t.ai} {pl}</div>
              <div className="flex flex-wrap gap-[2px] mb-1">
                {s.hands[pl].map((_, i) => <TileBack key={i} small />)}
              </div>
              <div className="flex flex-wrap gap-[1px] min-h-[16px]">
                {s.discards[pl].slice(-8).map((k, i) => <Tile key={i} k={k} small dim ariaLabel={`${t.discard}: ${tileLabel(k).text}`} />)}
              </div>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="text-center min-h-[24px]">
          {over ? (
            <span className="text-lg font-black">
              {s.winner === 0 ? `🎉 ${t.youWin}` : s.winner === -1 ? t.exhaust
                : `${t.ai} ${s.winner}${t.aiWin} (${s.winType === "tsumo" ? t.byTsumo : t.byRon})`}
            </span>
          ) : s.turn !== 0 ? (
            <span className="text-sm text-gray-500">{t.thinking}</span>
          ) : s.phase === "ron" ? (
            <span className="text-sm font-bold text-rose-600">{t.ron}?</span>
          ) : (
            <span className="text-sm text-emerald-700 font-semibold">{t.yourHand}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-2 min-h-[36px]">
          {canTsumo && <button type="button" onClick={humanTsumo} className="px-4 py-1.5 rounded-md bg-amber-500 text-white font-bold">{t.tsumo}</button>}
          {s.phase === "ron" && (
            <>
              <button type="button" onClick={humanRon} className="px-4 py-1.5 rounded-md bg-rose-600 text-white font-bold">{t.ron}</button>
              <button type="button" onClick={humanPassRon} className="px-4 py-1.5 rounded-md border border-gray-300 font-bold">{t.pass}</button>
            </>
          )}
        </div>

        {/* Your discards */}
        <div className="flex flex-wrap gap-[2px] justify-center min-h-[36px]">
          {s.discards[0].map((k, i) => <Tile key={i} k={k} small dim ariaLabel={`${t.discard}: ${tileLabel(k).text}`} />)}
        </div>

        {/* Your hand */}
        <div>
          <p className="text-[10px] font-black text-muted-foreground uppercase text-center tracking-widest mb-1">{t.yourHand}</p>
          <div className="flex flex-wrap gap-[3px] justify-center">
            {s.hands[0].map((k, i) => (
              <Tile key={`${k}-${i}`} k={k}
                onClick={yourTurn ? () => humanDiscard(k) : undefined}
                dim={s.phase === "ron"}
                reducedMotion={reducedMotion}
                ariaLabel={`${t.discard}: ${tileLabel(k).text}`} />
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">{t.record}: {record.w}W {record.l}L {record.d}D</p>
      </div>
    </GameContainer>
  );
};

export default Mahjong;
