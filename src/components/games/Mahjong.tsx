import React, { useCallback, useEffect, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";
import {
  isWinningHand, rankOf, suitOf, isHonor, shanten,
  type AiLevel,
} from "../../lib/games/ai/mahjong";
import {
  claimHumanRon,
  claimHumanTsumo,
  createMahjong,
  discardMahjong,
  discardMahjongAi,
  drawMahjong,
  mahjongCpuReview,
  passHumanRon,
  type MahjongCpuReview,
  type MahjongState,
} from "../../lib/games/mahjong";
import { clearMahjongSave, loadMahjongSave, storeMahjongSave } from "../../lib/games/mahjong-save";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { MAHJONG_SPRITES, mahjongTileSrc } from "../../lib/games/sprites";

const AI_DELAY = 700;

const i18n: Record<Locale, {
  title: string; you: string; ai: string; wall: string; discard: string; tsumo: string; ron: string;
  pass: string; yourHand: string; draws: string; thinking: string; reset: string; start: string;
  youWin: string; aiWin: string; exhaust: string; record: string; level1: string; level2: string; level3: string;
  byTsumo: string; byRon: string; rules: string; pause: string; paused: string; resume: string;
}> = {
  ko: { title: "마작 (간이)", you: "나", ai: "AI", wall: "패산", discard: "버림패", tsumo: "쯔모!", ron: "론!", pass: "패스", yourHand: "내 손패", draws: "장 남음", thinking: "AI 차례…", reset: "새 판", start: "게임 시작", youWin: "당신의 승리!", aiWin: "의 화료", exhaust: "유국 (무승부)", record: "전적", level1: "견습생", level2: "숙련가", level3: "명인", byTsumo: "쯔모", byRon: "론", rules: "폐형(멍패)만 · 4멘츠+1아타마 또는 치또이쯔로 화료", pause: "일시정지", paused: "대국 일시정지", resume: "계속하기" },
  en: { title: "Mahjong (Simple)", you: "You", ai: "AI", wall: "Wall", discard: "Discards", tsumo: "Tsumo!", ron: "Ron!", pass: "Pass", yourHand: "Your hand", draws: "left", thinking: "AI's turn…", reset: "New Game", start: "Start Game", youWin: "You win!", aiWin: " wins", exhaust: "Exhaustive draw", record: "Record", level1: "Apprentice", level2: "Adept", level3: "Master", byTsumo: "Tsumo", byRon: "Ron", rules: "Closed hands only · win with 4 melds + a pair, or seven pairs", pause: "Pause", paused: "Match paused", resume: "Resume" },
  ja: { title: "麻雀（簡易）", you: "あなた", ai: "AI", wall: "牌山", discard: "捨て牌", tsumo: "ツモ！", ron: "ロン！", pass: "パス", yourHand: "手牌", draws: "枚", thinking: "AIの番…", reset: "新しい局", start: "ゲーム開始", youWin: "あなたの和了！", aiWin: "の和了", exhaust: "流局", record: "戦績", level1: "見習い", level2: "熟練者", level3: "名人", byTsumo: "ツモ", byRon: "ロン", rules: "門前のみ・4面子1雀頭か七対子で和了", pause: "一時停止", paused: "対局を一時停止", resume: "再開" },
  zh: { title: "麻将（简易）", you: "你", ai: "AI", wall: "牌山", discard: "弃牌", tsumo: "自摸！", ron: "荣和！", pass: "过", yourHand: "手牌", draws: "张", thinking: "AI 回合…", reset: "新对局", start: "开始游戏", youWin: "你和了！", aiWin: " 和了", exhaust: "荒庄（平局）", record: "战绩", level1: "学徒", level2: "行家", level3: "大师", byTsumo: "自摸", byRon: "荣和", rules: "仅门清 · 四面子一雀头或七对子和牌", pause: "暂停", paused: "对局已暂停", resume: "继续" },
  fr: { title: "Mahjong (simple)", you: "Vous", ai: "IA", wall: "Mur", discard: "Défausses", tsumo: "Tsumo !", ron: "Ron !", pass: "Passer", yourHand: "Votre main", draws: "restantes", thinking: "Tour de l'IA…", reset: "Nouvelle partie", start: "Commencer", youWin: "Vous gagnez !", aiWin: " gagne", exhaust: "Mur épuisé (nul)", record: "Bilan", level1: "Apprenti", level2: "Adepte", level3: "Maître", byTsumo: "Tsumo", byRon: "Ron", rules: "Mains fermées · 4 combinaisons + une paire, ou sept paires", pause: "Pause", paused: "Partie en pause", resume: "Reprendre" },
  es: { title: "Mahjong (simple)", you: "Tú", ai: "IA", wall: "Muro", discard: "Descartes", tsumo: "¡Tsumo!", ron: "¡Ron!", pass: "Pasar", yourHand: "Tu mano", draws: "restantes", thinking: "Turno de la IA…", reset: "Nueva partida", start: "Empezar", youWin: "¡Has ganado!", aiWin: " gana", exhaust: "Muro agotado (empate)", record: "Historial", level1: "Aprendiz", level2: "Experto", level3: "Maestro", byTsumo: "Tsumo", byRon: "Ron", rules: "Manos cerradas · 4 grupos + una pareja, o siete parejas", pause: "Pausa", paused: "Partida en pausa", resume: "Continuar" },
};

// Latin shorthand (1m/5p/9s) is how players *write* hands online, but on the
// tile itself it reads as an alphanumeric code rather than a tile. Real tiles
// carry the CJK suit character, which is also what the honor tiles below
// already use. Kept as characters rather than the Unicode mahjong block
// (U+1F000..) because those depend on a font the device may not have, and 🀄
// in particular renders as a colour emoji on some systems and a glyph on others.
const SUIT_GLYPH = ["萬", "筒", "索"];
const SUIT_COLOR = ["#b91c1c", "#1d4ed8", "#15803d", "#4b5563"];
const HONOR_LABEL = ["東", "南", "西", "北", "白", "發", "中"];

const extra = {
  ko: { soundOn: "소리 켜기", soundOff: "소리 끄기", recommended: "추천", recommendation: "추천 버림패", shanten: "샹텐", turns: "순 진행", remaining: "남은 패", next: "다음 목표", liveTurn: "내 차례", policy: "AI 정책", last: "마지막 버림", reason: { variation: "합법 수 변주", tenpai: "텐파이 유지", shanten: "샹텐 줄이기", disposable: "고립패 정리" } },
  en: { soundOn: "Turn sound on", soundOff: "Turn sound off", recommended: "Recommended", recommendation: "Suggested discard", shanten: "Shanten", turns: "Turns", remaining: "Tiles left", next: "Next goal", liveTurn: "Your turn", policy: "AI policy", last: "Last discard", reason: { variation: "legal variation", tenpai: "keep tenpai", shanten: "cut shanten", disposable: "isolated tile" } },
  ja: { soundOn: "音をオン", soundOff: "音をオフ", recommended: "おすすめ", recommendation: "おすすめの捨て牌", shanten: "シャンテン", turns: "巡目", remaining: "残り牌", next: "次の目標", liveTurn: "あなたの番", policy: "AI方針", last: "最後の捨て牌", reason: { variation: "合法手の変奏", tenpai: "テンパイ維持", shanten: "シャンテン短縮", disposable: "孤立牌整理" } },
  zh: { soundOn: "开启声音", soundOff: "关闭声音", recommended: "推荐", recommendation: "推荐弃牌", shanten: "向听", turns: "巡数", remaining: "剩余牌", next: "下一目标", liveTurn: "你的回合", policy: "AI 策略", last: "最后弃牌", reason: { variation: "合法变奏", tenpai: "维持听牌", shanten: "降低向听", disposable: "整理孤张" } },
  fr: { soundOn: "Activer le son", soundOff: "Couper le son", recommended: "Conseillée", recommendation: "Défausse conseillée", shanten: "Shanten", turns: "Tours", remaining: "Tuiles restantes", next: "Prochain objectif", liveTurn: "À vous", policy: "Politique IA", last: "Dernière défausse", reason: { variation: "variation légale", tenpai: "garder tenpai", shanten: "baisser shanten", disposable: "tuile isolée" } },
  es: { soundOn: "Activar sonido", soundOff: "Silenciar", recommended: "Recomendada", recommendation: "Descarte sugerido", shanten: "Shanten", turns: "Turnos", remaining: "Fichas restantes", next: "Próximo objetivo", liveTurn: "Tu turno", policy: "Política IA", last: "Último descarte", reason: { variation: "variación legal", tenpai: "mantener tenpai", shanten: "bajar shanten", disposable: "ficha aislada" } },
} as const;

function tileLabel(k: number): { text: string; color: string } {
  if (isHonor(k)) return { text: HONOR_LABEL[k - 27], color: k >= 31 ? "#111827" : "#4b5563" };
  return { text: `${rankOf(k)}${SUIT_GLYPH[suitOf(k)]}`, color: SUIT_COLOR[suitOf(k)] };
}

function TileFace({ k, small }: { k: number; small?: boolean }) {
  return (
    <img
      src={mahjongTileSrc(k)}
      alt=""
      draggable={false}
      className={`pointer-events-none object-contain ${small ? "h-8 w-6" : "h-12 w-9"}`}
    />
  );
}

function Tile({ k, onClick, dim, small, ariaLabel, reducedMotion, selected, recommended, tabIndex, onKeyDown, buttonRef }: { k: number; onClick?: () => void; dim?: boolean; small?: boolean; ariaLabel?: string; reducedMotion?: boolean; selected?: boolean; recommended?: boolean; tabIndex?: number; onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void; buttonRef?: (element: HTMLButtonElement | null) => void }) {
  const { text } = tileLabel(k);
  const className = `inline-flex items-center justify-center overflow-hidden rounded-md ${!reducedMotion ? "transition-transform" : ""} ${
    small ? "h-8 w-6" : "min-h-12 w-full min-w-0"
  } ${onClick ? `${!reducedMotion ? "hover:-translate-y-1" : ""} cursor-pointer` : ""} ${selected ? "ring-2 ring-primary ring-offset-1" : ""} ${recommended ? "ring-2 ring-amber-500" : ""} ${dim ? "opacity-40" : ""}`;
  if (!onClick) {
    return <span aria-label={ariaLabel ?? text} className={className}><TileFace k={k} small={small} /></span>;
  }
  return (
    <button type="button" ref={buttonRef} onClick={onClick} onKeyDown={onKeyDown} tabIndex={tabIndex} aria-label={ariaLabel ?? text} aria-current={recommended ? "true" : undefined}
      className={className}>
      <TileFace k={k} small={small} />
    </button>
  );
}
function TileBack({ small }: { small?: boolean }) {
  return (
    <img
      src={MAHJONG_SPRITES.back}
      alt=""
      draggable={false}
      className={`inline-block object-contain ${small ? "h-7 w-5" : "h-9 w-6"}`}
    />
  );
}

const Mahjong: React.FC<{ locale?: Locale }> = ({ locale = "ko" }) => {
  const t = i18n[locale] ?? i18n.en;
  const x = extra[locale] ?? extra.en;
  const reducedMotion = usePrefersReducedMotion();
  const [level, setLevel] = useState<AiLevel>(2);
  const [game, setGame] = useState<MahjongState | null>(null);
  const [paused, setPaused] = useState(false);
  const [selectedTile, setSelectedTile] = useState(0);
  const [muted, setMuted] = useState(false);
  const tileRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  mutedRef.current = muted;
  const [record, setRecord] = useState<GameRecord>({ w: 0, l: 0, d: 0 });
  const [lastCpu, setLastCpu] = useState<MahjongCpuReview | null>(null);
  const recorded = useRef(false);

  const playTone = useCallback((kind: "draw" | "discard" | "win") => {
    if (mutedRef.current || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = audioContext.current ?? new AudioContextClass(); audioContext.current = context;
    const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = kind === "win" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(kind === "draw" ? 260 : kind === "discard" ? 190 : 620, context.currentTime);
    if (kind === "win") oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.22);
    gain.gain.setValueAtTime(kind === "win" ? 0.065 : 0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === "win" ? 0.28 : 0.1));
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + (kind === "win" ? 0.28 : 0.1));
  }, []);

  useEffect(() => {
    setRecord(getRecord("mahjong"));
    const saved = loadMahjongSave();
    if (saved) { setGame(saved.state); setLevel(saved.level); setPaused(true); }
  }, []);

  useEffect(() => {
    if (!game || game.phase !== "over" || recorded.current || game.winner === null) return;
    clearMahjongSave();
    recorded.current = true;
    const result = game.winner === 0 ? "w" : game.winner === -1 ? "d" : "l";
    setRecord(recordResult("mahjong", result));
    playTone("win");
  }, [game, playTone]);

  useEffect(() => () => { void audioContext.current?.close(); }, []);

  const newGame = useCallback(() => {
    clearMahjongSave();
    const seed = typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now();
    recorded.current = false;
    setPaused(false);
    setSelectedTile(0);
    setLastCpu(null);
    setGame(createMahjong(seed));
  }, []);

  useEffect(() => {
    if (game && game.phase !== "over") storeMahjongSave(game, level);
  }, [game, level]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden && game && game.phase !== "over") { storeMahjongSave(game, level); setPaused(true); } };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [game, level]);

  const humanDiscard = (tileIndex: number) => { playTone("discard"); setGame((state) => state ? discardMahjong(state, tileIndex) : state); setSelectedTile(0); };
  const humanTsumo = () => setGame((state) => state ? claimHumanTsumo(state) : state);
  const humanRon = () => setGame((state) => state ? claimHumanRon(state) : state);
  const humanPassRon = () => setGame((state) => state ? passHumanRon(state) : state);

  // AI / auto stepping.
  useEffect(() => {
    if (!game || game.phase === "over" || paused) return;
    if (game.phase === "draw") {
      const id = setTimeout(() => setGame((state) => state ? drawMahjong(state) : state), game.turn === 0 ? 120 : AI_DELAY);
      return () => clearTimeout(id);
    }
    if (game.phase === "discard" && game.turn !== 0) {
      const id = setTimeout(() => {
        setLastCpu(mahjongCpuReview(game, level));
        setGame((state) => state ? discardMahjongAi(state, level) : state);
      }, AI_DELAY);
      return () => clearTimeout(id);
    }
  }, [game, level, paused]);

  if (!game) {
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

  const s = game;
  const over = s.phase === "over";
  const yourTurn = s.turn === 0 && s.phase === "discard";
  const canTsumo = yourTurn && isWinningHand(s.hands[0]);
  const drawsLeft = s.wall.length - s.wallPos;
  const recommendedIndex = yourTurn ? s.hands[0].reduce((bestIndex, _tile, index, hand) => {
    const candidate = hand.slice(); candidate.splice(index, 1);
    const best = hand.slice(); best.splice(bestIndex, 1);
    return shanten(candidate) < shanten(best) ? index : bestIndex;
  }, 0) : -1;
  const recommendedShanten = recommendedIndex >= 0 ? shanten(s.hands[0].filter((_tile, index) => index !== recommendedIndex)) : null;

  const handleTileKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = Math.min(s.hands[0].length - 1, index + 1);
    else if (event.key === "ArrowLeft") next = Math.max(0, index - 1);
    else if (event.key === "ArrowDown") next = Math.min(s.hands[0].length - 1, index + 7);
    else if (event.key === "ArrowUp") next = Math.max(0, index - 7);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = s.hands[0].length - 1;
    else return;
    event.preventDefault(); setSelectedTile(next); tileRefs.current[next]?.focus();
  };

  return (
    <GameContainer title={t.title} subtitle={`${t.wall}: ${drawsLeft} ${t.draws}`} onReset={newGame}>
      <div className="relative flex flex-col gap-3">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => { if (!paused) storeMahjongSave(s, level); setPaused((value) => !value); }} className="min-h-11 rounded-lg border border-border px-4 text-xs font-bold hover:bg-muted">{paused ? t.resume : t.pause}</button>
          <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? x.soundOn : x.soundOff} aria-pressed={!muted} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border">{muted ? "🔇" : "🔊"}</button>
        </div>
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
        <div className="flex justify-center gap-2 min-h-11">
          {canTsumo && <button type="button" onClick={humanTsumo} className="min-h-11 px-4 rounded-md bg-amber-500 text-white font-bold">{t.tsumo}</button>}
          {s.phase === "ron" && (
            <>
              <button type="button" onClick={humanRon} className="min-h-11 px-4 rounded-md bg-rose-600 text-white font-bold">{t.ron}</button>
              <button type="button" onClick={humanPassRon} className="min-h-11 px-4 rounded-md border border-gray-300 font-bold">{t.pass}</button>
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
          {yourTurn && recommendedShanten !== null && <p className="mb-2 text-center text-xs text-amber-700">{x.recommendation}: {tileLabel(s.hands[0][recommendedIndex]).text} · {x.shanten} {recommendedShanten}</p>}
          <div className="mx-auto grid w-full max-w-sm grid-cols-7 gap-1" role="group" aria-label={t.yourHand}>
            {s.hands[0].map((k, i) => (
              <Tile key={`${k}-${i}`} k={k}
                onClick={yourTurn && !paused ? () => humanDiscard(i) : undefined}
                dim={s.phase === "ron"}
                reducedMotion={reducedMotion}
                selected={selectedTile === i}
                recommended={recommendedIndex === i}
                tabIndex={yourTurn && !paused ? (selectedTile === i ? 0 : -1) : undefined}
                onKeyDown={(event) => handleTileKey(event, i)}
                buttonRef={(element) => { tileRefs.current[i] = element; }}
                ariaLabel={`${t.discard}: ${tileLabel(k).text}${recommendedIndex === i ? `, ${x.recommended}` : ""}`} />
            ))}
          </div>
        </div>

        {over && <div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-muted p-3"><span className="block text-muted-foreground">{x.turns}</span><b>{s.turns}</b></div><div className="rounded-xl bg-muted p-3"><span className="block text-muted-foreground">{x.remaining}</span><b>{drawsLeft}</b></div><div className="rounded-xl bg-muted p-3"><span className="block text-muted-foreground">{x.next}</span><b>{s.winner === 0 ? x.shanten : x.recommendation}</b></div></div>}
        {over && lastCpu && s.winner !== 0 && s.winner !== -1 && <p className="text-center text-xs text-muted-foreground">{x.last}: {tileLabel(lastCpu.tile).text} · {x.reason[lastCpu.reason]} · {x.shanten} {lastCpu.shantenAfter}</p>}
        <p className="text-center text-[11px] text-muted-foreground">{x.policy}: {level === 1 ? t.level1 : level === 2 ? t.level2 : t.level3}</p>

        <p className="text-center text-xs text-gray-400">{t.record}: {record.w}W {record.l}L {record.d}D</p>
        {paused && <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-background/80 backdrop-blur-sm"><div className="text-center"><p className="mb-3 font-black">{t.paused}</p><button type="button" onClick={() => setPaused(false)} className="min-h-11 rounded-full bg-primary px-8 font-bold text-primary-foreground">{t.resume}</button></div></div>}
        <p className="sr-only" role="status" aria-live="polite">{paused ? t.paused : over ? (s.winner === 0 ? t.youWin : s.winner === -1 ? t.exhaust : `${t.ai} ${s.winner}${t.aiWin}`) : yourTurn ? `${x.liveTurn}. ${x.remaining} ${drawsLeft}` : t.thinking}</p>
      </div>
    </GameContainer>
  );
};

export default Mahjong;
