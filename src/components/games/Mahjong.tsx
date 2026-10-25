import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Share2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import {
  isWinningHand, rankOf, suitOf, isHonor, shanten, getWaitingTiles,
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
import { useArcadePortal } from "../../lib/games/arcade-portal";

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
  ko: { soundOn: "소리 켜기", soundOff: "소리 끄기", recommended: "추천", recommendation: "추천 버림패", shanten: "샹텐", turns: "순 진행", remaining: "남은 패", next: "다음 목표", liveTurn: "내 차례", policy: "AI 정책", last: "마지막 버림", yakuGuide: "1판 역 가이드", tenpai: "텐파이", waits: "대기패", close: "닫기", reason: { variation: "합법 수 변주", tenpai: "텐파이 유지", shanten: "샹텐 줄이기", disposable: "고립패 정리" } },
  en: { soundOn: "Turn sound on", soundOff: "Turn sound off", recommended: "Recommended", recommendation: "Suggested discard", shanten: "Shanten", turns: "Turns", remaining: "Tiles left", next: "Next goal", liveTurn: "Your turn", policy: "AI policy", last: "Last discard", yakuGuide: "1-Han Yaku Guide", tenpai: "Tenpai", waits: "Waiting Tiles", close: "Close", reason: { variation: "legal variation", tenpai: "keep tenpai", shanten: "cut shanten", disposable: "isolated tile" } },
  ja: { soundOn: "音をオン", soundOff: "音をオフ", recommended: "おすすめ", recommendation: "おすすめの捨て牌", shanten: "シャンテン", turns: "巡目", remaining: "残り牌", next: "次の目標", liveTurn: "あなたの番", policy: "AI方針", last: "最後の捨て牌", yakuGuide: "役一覧ガイド", tenpai: "テンパイ", waits: "待ち牌", close: "閉じる", reason: { variation: "合法手の変奏", tenpai: "テンパイ維持", shanten: "シャンテン短縮", disposable: "孤立牌整理" } },
  zh: { soundOn: "开启声音", soundOff: "关闭声音", recommended: "推荐", recommendation: "推荐弃牌", shanten: "向听", turns: "巡数", remaining: "剩余牌", next: "下一目标", liveTurn: "你的回合", policy: "AI 策略", last: "最后弃牌", yakuGuide: "番型指南", tenpai: "听牌", waits: "所听之牌", close: "关闭", reason: { variation: "合法变奏", tenpai: "维持听牌", shanten: "降低向听", disposable: "整理孤张" } },
  fr: { soundOn: "Activer le son", soundOff: "Couper le son", recommended: "Conseillée", recommendation: "Défausse conseillée", shanten: "Shanten", turns: "Tours", remaining: "Tuiles restantes", next: "Prochain objectif", liveTurn: "À vous", policy: "Politique IA", last: "Dernière défausse", yakuGuide: "Guide des Yakus", tenpai: "Tenpai", waits: "Tuiles d'attente", close: "Fermer", reason: { variation: "variation légale", tenpai: "garder tenpai", shanten: "baisser shanten", disposable: "tuile isolée" } },
  es: { soundOn: "Activar sonido", soundOff: "Silenciar", recommended: "Recomendada", recommendation: "Descarte sugerido", shanten: "Shanten", turns: "Turnos", remaining: "Fichas restantes", next: "Próximo objetivo", liveTurn: "Tu turno", policy: "Política IA", last: "Último descarte", yakuGuide: "Guía de Yakus", tenpai: "Tenpai", waits: "Fichas en espera", close: "Cerrar", reason: { variation: "variación legal", tenpai: "mantener tenpai", shanten: "bajar shanten", disposable: "ficha aislada" } },
} as const;

const YAKU_LIST = [
  { name: { ko: "멘젠 츠모 (門前清自摸和)", en: "Menzen Tsumo (Self-Draw)", ja: "門前清自摸和", zh: "门前清自摸和", fr: "Menzen Tsumo", es: "Menzen Tsumo" }, han: "1판", desc: { ko: "울지 않고 순수 쯔모로 손패 완성", en: "Win by self-draw with a fully closed hand", ja: "鳴かずにツモで和了", zh: "门清状态下自摸和牌", fr: "Victoire par pioche en main fermée", es: "Victoria por robo con mano cerrada" } },
  { name: { ko: "리치 (立直)", en: "Riichi (Ready Hand)", ja: "立直", zh: "立直", fr: "Riichi", es: "Riichi" }, han: "1판", desc: { ko: "멘젠 텐파이 상태에서 선언 (1천 점 공탁)", en: "Declared when in closed tenpai", ja: "門前テンパイ時に宣言", zh: "门清听牌时宣告", fr: "Déclaré en main prête fermée", es: "Declarado en mano lista cerrada" } },
  { name: { ko: "탕야오 (断么九)", en: "Tanyao (All Simples)", ja: "断么九", zh: "断么九", fr: "Tanyao", es: "Tanyao" }, han: "1판", desc: { ko: "1, 9, 자패 없이 2~8 수패만으로 구성", en: "Tiles 2–8 only without 1, 9, winds or dragons", ja: "1・9・字牌を使わず2〜8の数牌のみ", zh: "无一九与字牌，仅使用2至8数牌", fr: "Tuiles 2 à 8 sans honneurs", es: "Fichas del 2 al 8 sin honores" } },
  { name: { ko: "핑후 (平和)", en: "Pinfu (All Sequences)", ja: "平和", zh: "平和", fr: "Pinfu", es: "Pinfu" }, han: "1판", desc: { ko: "4개 슌츠(연속 숫자) + 무역패 머리 + 양면 대기", en: "4 sequences + non-value pair + two-sided wait", ja: "4面子すべて順子＋役無しの雀頭＋両面待ち", zh: "四个顺子+无役雀头+两面听牌", fr: "4 suites + paire neutre + attente bilatérale", es: "4 secuencias + pareja neutra + espera bilateral" } },
  { name: { ko: "역패 (役牌)", en: "Yakuhai (Value Honor)", ja: "役牌", zh: "役牌", fr: "Yakuhai", es: "Yakuhai" }, han: "1판", desc: { ko: "삼원패(백/발/중) 또는 자풍/장풍패 3장 완성", en: "Triplet of Dragons or round/seat wind", ja: "三元牌（白・發・中）または場風・自風の刻子", zh: "三元牌（白发中）或圈风/门风刻子", fr: "Brelan de dragons ou de vent", es: "Trío de dragones o de viento" } },
  { name: { ko: "이페코 (一盃口)", en: "Iipeiko (Double Run)", ja: "一盃口", zh: "一盃口", fr: "Iipeiko", es: "Iipeiko" }, han: "1판", desc: { ko: "동일한 색상과 숫자의 슌츠 2쌍 (예: 234만 + 234만)", en: "Two identical sequences in the same suit", ja: "同色同数の順子が2組（例：234萬×2）", zh: "同门同数字的两组顺子（例：234万×2）", fr: "Deux suites identiques de même couleur", es: "Dos secuencias idénticas del mismo palo" } },
  { name: { ko: "치또이츠 (七対子)", en: "Chiitoitsu (Seven Pairs)", ja: "七対子", zh: "七对子", fr: "Chiitoitsu", es: "Chiitoitsu" }, han: "2판", desc: { ko: "서로 다른 7종류의 또이츠(2장 쌍)로 완성", en: "Seven distinct pairs", ja: "相異なる7つの対子で構成", zh: "七组不同的对子", fr: "Sept paires distinctes", es: "Siete parejas distintas" } },
];

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

function Tile({ k, onClick, dim, small, ariaLabel, reducedMotion, selected, recommended, fresh, tabIndex, onKeyDown, buttonRef }: { k: number; onClick?: () => void; dim?: boolean; small?: boolean; ariaLabel?: string; reducedMotion?: boolean; selected?: boolean; recommended?: boolean; fresh?: boolean; tabIndex?: number; onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void; buttonRef?: (element: HTMLButtonElement | null) => void }) {
  const { text } = tileLabel(k);
  const className = `inline-flex items-center justify-center overflow-hidden rounded-md ${!reducedMotion ? "transition-transform" : ""} ${
    small ? "h-8 w-6" : "min-h-12 w-full min-w-0"
  } ${onClick ? `${!reducedMotion ? "hover:-translate-y-1" : ""} cursor-pointer` : ""} ${selected ? "ring-2 ring-primary ring-offset-1" : ""} ${recommended ? "ring-2 ring-warning" : ""} ${dim ? "opacity-40" : ""} ${fresh && !reducedMotion ? "oiyo-tile-land" : ""}`;
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
  const [showYakuGuide, setShowYakuGuide] = useState(false);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("mahjong_sound_muted") === "true";
    } catch {
      return false;
    }
  });
  const toggleSound = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mahjong_sound_muted", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        togglePortal();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleSound();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePortal, toggleSound]);

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

  const [shareCardCopied, setShareCardCopied] = useState(false);

  useEffect(() => {
    if (!game || game.phase !== "over" || recorded.current || game.winner === null) return;
    clearMahjongSave();
    recorded.current = true;
    const result = game.winner === 0 ? "w" : game.winner === -1 ? "d" : "l";
    setRecord(recordResult("mahjong", result));
    playTone("win");
    if (result === "w" && containerRef.current) {
      celebrate(containerRef.current, { preset: "tiles" });
    }
  }, [game, playTone]);

  const handleShareCard = useCallback(async () => {
    if (!game) return;
    try {
      const isWin = game.winner === 0;
      const canvas = createShareCardCanvas({
        title: t.title,
        subtitle: isWin ? `화료 승리 (${game.winType === "tsumo" ? t.tsumo : t.ron})` : "Mahjong Game",
        score: isWin ? "VICTORY" : "COMPLETE",
        bestScore: `${record.w}W - ${record.l}L`,
        slug: "mahjong",
        customStats: [
          { label: "RESULT", value: isWin ? t.youWin : game.winner === -1 ? t.exhaust : `${t.ai} ${game.winner}${t.aiWin}` },
          { label: t.record, value: `${record.w}W ${record.l}L ${record.d}D` },
        ],
      });
      const success = await copyShareCardToClipboard(canvas);
      if (success) {
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2000);
      } else {
        downloadShareCard(canvas, `mahjong-${Date.now()}.png`);
      }
    } catch {}
  }, [game, record.d, record.l, record.w, t.ai, t.aiWin, t.exhaust, t.record, t.ron, t.title, t.tsumo, t.youWin]);

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
      <div ref={containerRef} className="w-full flex flex-col items-center justify-center">
        <GameContainer title={t.title}>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={toggleSound}
                aria-label={muted ? x.soundOn : x.soundOff}
                className="min-h-11 px-3 py-2 rounded-lg border border-border hover:bg-muted inline-flex items-center gap-1.5 text-xs font-bold"
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <button
                type="button"
                onClick={togglePortal}
                aria-label={isImmersive ? 'Exit Immersion' : 'Immersion'}
                className="min-h-11 px-3 py-2 rounded-lg border border-border hover:bg-muted inline-flex items-center gap-1.5 text-xs font-bold"
              >
                {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground max-w-md text-center">{t.rules}</p>
            <div className="flex gap-2">
              {([1, 2, 3] as AiLevel[]).map((lv) => (
                <button type="button" key={lv} onClick={() => setLevel(lv)} aria-pressed={level === lv}
                  className={`px-3 py-1.5 rounded-md text-sm font-bold border ${level === lv ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                  {lv === 1 ? t.level1 : lv === 2 ? t.level2 : t.level3}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={newGame} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold">{t.start}</button>
              <button type="button" onClick={() => setShowYakuGuide(true)} className="px-4 py-2.5 rounded-lg border border-border bg-card text-foreground font-bold text-sm hover:bg-muted transition-colors flex items-center gap-1.5">
                <span>📖</span>
                <span>{x.yakuGuide}</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t.record}: {record.w}W {record.l}L {record.d}D</p>
          </div>
        </GameContainer>
      </div>
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

  const currentHand13 = s.hands[0].length === 13 ? s.hands[0] : s.hands[0].filter((_, idx) => idx === (selectedTile >= 0 && selectedTile < s.hands[0].length ? selectedTile : recommendedIndex));
  const waitingTiles = getWaitingTiles(currentHand13);

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
    <div ref={containerRef} className="w-full flex flex-col items-center justify-center">
      <GameContainer title={t.title} subtitle={`${t.wall}: ${drawsLeft} ${t.draws}`} onReset={newGame}>
        <div className="relative flex flex-col gap-3">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowYakuGuide(true)} className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold hover:bg-muted transition-colors flex items-center gap-1.5">
              <span>📖</span>
              <span className="hidden sm:inline">{x.yakuGuide}</span>
            </button>
            <button type="button" onClick={() => { if (!paused) storeMahjongSave(s, level); setPaused((value) => !value); }} className="min-h-11 rounded-lg border border-border px-4 text-xs font-bold hover:bg-muted">{paused ? t.resume : t.pause}</button>
            <button type="button" onClick={toggleSound} aria-label={muted ? x.soundOn : x.soundOff} aria-pressed={!muted} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted">
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <button type="button" onClick={togglePortal} aria-label={isImmersive ? 'Exit Immersion' : 'Immersion'} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted">
              {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        {/* AI seats */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((pl) => (
            <div key={pl} className={`rounded-lg border p-2 ${s.turn === pl && !over ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="text-xs font-bold text-muted-foreground mb-1">{t.ai} {pl}</div>
              <div className="flex flex-wrap gap-[2px] mb-1">
                {s.hands[pl].map((_, i) => <TileBack key={i} small />)}
              </div>
              <div className="flex flex-wrap gap-[1px] min-h-[16px]">
                {s.discards[pl].slice(-8).map((k, i) => { const start = Math.max(0, s.discards[pl].length - 8); return <Tile key={`${pl}-${start + i}`} k={k} small dim fresh={start + i === s.discards[pl].length - 1} reducedMotion={reducedMotion} ariaLabel={`${t.discard}: ${tileLabel(k).text}`} />; })}
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
            <span className="text-sm text-muted-foreground">{t.thinking}</span>
          ) : s.phase === "ron" ? (
            <span className="text-sm font-bold text-destructive">{t.ron}?</span>
          ) : (
            <span className="text-sm text-primary font-semibold">{t.yourHand}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-2 min-h-11">
          {over && (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={handleShareCard}
                className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Share2 className="h-3.5 w-3.5 text-primary" />
                <span>{shareCardCopied ? "✓ 복사됨" : "결과 카드 복사"}</span>
              </button>
              <button
                type="button"
                onClick={newGame}
                className="min-h-11 px-5 rounded-full bg-primary text-primary-foreground font-black text-xs shadow-md hover:opacity-90"
              >
                {t.reset}
              </button>
            </div>
          )}
          {canTsumo && <button type="button" onClick={humanTsumo} className="min-h-11 px-4 rounded-md bg-warning text-warning-foreground font-bold">{t.tsumo}</button>}
          {s.phase === "ron" && (
            <>
              <button type="button" onClick={humanRon} className="min-h-11 px-4 rounded-md bg-destructive text-destructive-foreground font-bold">{t.ron}</button>
              <button type="button" onClick={humanPassRon} className="min-h-11 px-4 rounded-md border border-border font-bold hover:bg-muted">{t.pass}</button>
            </>
          )}
        </div>

        {/* Your discards */}
        <div className="flex flex-wrap gap-[2px] justify-center min-h-[36px]">
          {s.discards[0].map((k, i) => <Tile key={i} k={k} small dim fresh={i === s.discards[0].length - 1} reducedMotion={reducedMotion} ariaLabel={`${t.discard}: ${tileLabel(k).text}`} />)}
        </div>

        {/* Real-time Tenpai / Waiting Tiles Assist */}
        {waitingTiles.length > 0 && (
          <div className="mx-auto w-full max-w-sm rounded-xl border border-warning/40 bg-warning/10 p-2 text-center flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs font-black text-warning">
              🀄 {x.tenpai} ({x.waits} {waitingTiles.length}):
            </span>
            <div className="flex items-center gap-1">
              {waitingTiles.map((wt) => (
                <span key={wt} className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card px-1.5 py-0.5 text-xs font-bold text-foreground">
                  <TileFace k={wt} small />
                  <span>{tileLabel(wt).text}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Your hand */}
        <div>
          <p className="text-xs font-black text-muted-foreground uppercase text-center tracking-widest mb-1">{t.yourHand}</p>
          {yourTurn && recommendedShanten !== null && <p className="mb-2 text-center text-xs text-warning font-black">{x.recommendation}: {tileLabel(s.hands[0][recommendedIndex]).text} · {x.shanten} {recommendedShanten}</p>}
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
        <p className="text-center text-xs text-muted-foreground">{x.policy}: {level === 1 ? t.level1 : level === 2 ? t.level2 : t.level3}</p>

        <p className="text-center text-xs text-muted-foreground">{t.record}: {record.w}W {record.l}L {record.d}D</p>
        {paused && <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-background/80 backdrop-blur-sm"><div className="text-center"><p className="mb-3 font-black">{t.paused}</p><button type="button" onClick={() => setPaused(false)} className="min-h-11 rounded-full bg-primary px-8 font-bold text-primary-foreground">{t.resume}</button></div></div>}
        <p className="sr-only" role="status" aria-live="polite">{paused ? t.paused : over ? (s.winner === 0 ? t.youWin : s.winner === -1 ? t.exhaust : `${t.ai} ${s.winner}${t.aiWin}`) : yourTurn ? `${x.liveTurn}. ${x.remaining} ${drawsLeft}` : t.thinking}</p>
      </div>
    </GameContainer>

    {/* Yaku Guide Modal */}
    {showYakuGuide && (
      <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="max-w-md w-full max-h-full overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <div className="text-lg font-black text-foreground flex items-center gap-2">
                <span>📖</span>
                <span>{x.yakuGuide}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {locale === "ko" ? "마작의 기초 필수 화료 조건 (초보자 1·2판 역)" : "Basic Winning Conditions in Mahjong"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowYakuGuide(false)}
              className="min-h-11 min-w-11 rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={x.close}
            >
              ✕
            </button>
          </div>

          <div className="grid gap-2.5">
            {YAKU_LIST.map((yaku, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-border bg-muted/30 text-left space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-foreground">
                    {yaku.name[locale] ?? yaku.name.en}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-black bg-primary/10 text-primary border border-primary/20">
                    {yaku.han}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {yaku.desc[locale] ?? yaku.desc.en}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowYakuGuide(false)}
            className="w-full py-2.5 rounded-xl border border-border bg-muted/60 hover:bg-muted font-black text-xs text-foreground transition-colors"
          >
            {x.close}
          </button>
        </div>
      </div>
    )}
    </div>
  );
};

export default Mahjong;
