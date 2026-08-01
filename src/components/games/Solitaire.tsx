import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer, PlayingCard } from '../ui/game/GamePrimitives';
import { getRecord, recordResult, getBestForConditions, recordBestForConditions, getDailyStreak, recordDailyWin, type BestConditions, type DailyStreak, type GameRecord } from '../../lib/games/records';
import { dayIndex, todayKey, previousDayKey } from '../../lib/games/daily';
import {
  SOLITAIRE_SUITS,
  applySolitaireMove,
  createSeededSolitaireDeal,
  isSolitaireWon,
  isValidTableauRun,
  type SolitaireMove,
  type SolitaireState,
  type SolitaireSuit,
} from '../../lib/games/solitaire';
import {
  clearSolitaireSaveV2,
  loadSolitaireSaveV2,
  restoredSolitaireSeconds,
  solitaireDailySeed,
  storeSolitaireSaveV2,
  type SolitaireMode,
} from '../../lib/games/solitaire-save';

type Selection =
  | { type: 'tableau'; column: number; cardIndex: number }
  | { type: 'waste' }
  | { type: 'foundation'; suit: SolitaireSuit };

const COPY = {
  ko: { title: '솔리테어 (Solitaire)', subtitle: '클론다이크 · 드로우 1', desc: '카드를 교대색 내림차순으로 옮기고, 무늬별로 A부터 K까지 완성하세요.', reset: '새 게임', win: '네 개의 무늬를 모두 완성했습니다!', record: '전적', stock: '스톡에서 한 장 뽑기', recycle: '폐기 더미를 스톡으로 되돌리기', waste: '폐기 더미', foundation: '파운데이션', tableau: '테이블 열', selected: '선택됨', illegal: '그곳에는 놓을 수 없습니다.', moved: '카드를 옮겼습니다.', instructions: '카드나 연속 묶음을 선택한 뒤 목적지 열 또는 파운데이션을 누르세요. 빈 열에는 K만 놓을 수 있습니다.', empty: '빈 열', daily: '📅 오늘의 도전', free: '자유 플레이', streak: '연속', time: '시간', moves: '이동', undo: '되돌리기', undone: '한 수를 되돌렸습니다.', best: '최단 기록', newBest: '새 최단 기록!', nextGoal: '다음 목표', assisted: '되돌리기 사용 기록', untimed: '이전 버전에서 이어진 판이라 시간 기록은 남지 않습니다.' },
  en: { title: 'Solitaire', subtitle: 'Klondike · Draw 1', desc: 'Build down in alternating colors, then complete each suit from Ace to King.', reset: 'New game', win: 'All four suits are complete!', record: 'Record', stock: 'Draw one card from stock', recycle: 'Recycle waste into stock', waste: 'Waste pile', foundation: 'Foundation', tableau: 'Tableau column', selected: 'Selected', illegal: 'That move is not legal.', moved: 'Card moved.', instructions: 'Select a card or face-up run, then choose a destination column or foundation. Only a King can fill an empty column.', empty: 'Empty column', daily: '📅 Daily Challenge', free: 'Free Play', streak: 'Streak', time: 'Time', moves: 'Moves', undo: 'Undo', undone: 'Undid one move.', best: 'Best Time', newBest: 'New best time!', nextGoal: 'Next goal', assisted: 'Assisted (undo) record', untimed: 'This game continued from an older version, so no time record is kept.' },
  ja: { title: 'ソリティア', subtitle: 'クロンダイク・1枚めくり', desc: '赤黒交互の降順で移動し、スートごとにAからKまで完成させます。', reset: '新しいゲーム', win: '4つのスートが完成しました！', record: '戦績', stock: '山札から1枚引く', recycle: '捨て札を山札に戻す', waste: '捨て札', foundation: '組札', tableau: '場札の列', selected: '選択中', illegal: 'そこには置けません。', moved: 'カードを移動しました。', instructions: 'カードまたは表向きの並びを選び、移動先の列か組札を押します。空の列にはKだけ置けます。', empty: '空の列', daily: '📅 デイリー挑戦', free: 'フリープレイ', streak: '連続', time: '時間', moves: '手数', undo: '元に戻す', undone: '1手戻しました。', best: '最短記録', newBest: '新記録！', nextGoal: '次の目標', assisted: '元に戻す使用記録', untimed: '旧バージョンから続いた盤面のため、時間記録は残りません。' },
  zh: { title: '纸牌接龙', subtitle: '克朗代克·翻一张', desc: '按红黑交替降序移动，再将每种花色从A排到K。', reset: '新游戏', win: '四种花色全部完成！', record: '战绩', stock: '从牌堆抽一张', recycle: '将废牌堆放回牌堆', waste: '废牌堆', foundation: '基础牌堆', tableau: '桌面列', selected: '已选择', illegal: '不能放到那里。', moved: '已移动纸牌。', instructions: '选择一张牌或正面连续牌组，再选择目标列或基础牌堆。空列只能放K。', empty: '空列', daily: '📅 每日挑战', free: '自由模式', streak: '连续', time: '时间', moves: '步数', undo: '撤销', undone: '已撤销一步。', best: '最快记录', newBest: '新的最快记录！', nextGoal: '下一目标', assisted: '使用撤销的记录', untimed: '此局从旧版本延续，因此不保留时间记录。' },
  fr: { title: 'Solitaire', subtitle: 'Klondike · Tirage 1', desc: 'Descendez en alternant les couleurs, puis complétez chaque couleur de l’as au roi.', reset: 'Nouvelle partie', win: 'Les quatre couleurs sont complètes !', record: 'Bilan', stock: 'Piocher une carte', recycle: 'Remettre la défausse dans la pioche', waste: 'Défausse', foundation: 'Fondation', tableau: 'Colonne', selected: 'Sélectionné', illegal: 'Ce déplacement est interdit.', moved: 'Carte déplacée.', instructions: 'Sélectionnez une carte ou une suite visible, puis une colonne ou une fondation. Seul un roi peut occuper une colonne vide.', empty: 'Colonne vide', daily: '📅 Défi du jour', free: 'Partie libre', streak: 'Série', time: 'Temps', moves: 'Coups', undo: 'Annuler', undone: 'Un coup annulé.', best: 'Meilleur temps', newBest: 'Nouveau meilleur temps !', nextGoal: 'Prochain objectif', assisted: 'Record avec annulation', untimed: 'Partie reprise d’une ancienne version : aucun temps n’est enregistré.' },
  es: { title: 'Solitario', subtitle: 'Klondike · Robar 1', desc: 'Baja alternando colores y completa cada palo del as al rey.', reset: 'Nueva partida', win: '¡Los cuatro palos están completos!', record: 'Historial', stock: 'Robar una carta', recycle: 'Devolver el descarte al mazo', waste: 'Descarte', foundation: 'Base', tableau: 'Columna', selected: 'Seleccionada', illegal: 'Ese movimiento no es válido.', moved: 'Carta movida.', instructions: 'Selecciona una carta o secuencia visible y luego una columna o base. Solo un rey puede ocupar una columna vacía.', empty: 'Columna vacía', daily: '📅 Reto diario', free: 'Juego libre', streak: 'Racha', time: 'Tiempo', moves: 'Jugadas', undo: 'Deshacer', undone: 'Se deshizo una jugada.', best: 'Mejor tiempo', newBest: '¡Nuevo mejor tiempo!', nextGoal: 'Siguiente objetivo', assisted: 'Récord con deshacer', untimed: 'Esta partida continuó de una versión anterior, así que no se guarda el tiempo.' },
} as const;

const SUIT_ICON: Record<SolitaireSuit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const UNDO_STACK_LIMIT = 100;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const DAILY_GAME_ID = 'solitaire-daily';

function createGenerationSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x1_0000_0000)) | 0;
}

const Solitaire: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const [mode, setMode] = useState<SolitaireMode>('daily');
  const [dailyDate, setDailyDate] = useState(() => todayKey());
  const [game, setGame] = useState<SolitaireState>(() => createSeededSolitaireDeal(solitaireDailySeed()));
  const [selection, setSelection] = useState<Selection | null>(null);
  const [announcement, setAnnouncement] = useState<string>(t.instructions);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [moves, setMoves] = useState(0);
  const [undoCount, setUndoCount] = useState(0);
  const [undoStack, setUndoStack] = useState<SolitaireState[]>([]);
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [legacyMigrated, setLegacyMigrated] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const seedRef = useRef(0);
  const startedAt = useRef<number | null>(null);
  const moveMadeRef = useRef(false);
  const wonRef = useRef(false);

  const conditionsFor = useCallback((nextMode: SolitaireMode, seed: number, date: string, assist: 'none' | 'undo'): BestConditions => ({
    seed: nextMode === 'daily' ? `daily-${date}` : `free-${seed}`,
    difficulty: 'draw-1',
    assist,
  }), []);

  const initGame = useCallback((nextMode: SolitaireMode) => {
    if (moveMadeRef.current && !wonRef.current) setRecord(recordResult('solitaire', 'l'));
    moveMadeRef.current = false;
    wonRef.current = false;
    clearSolitaireSaveV2();
    const today = todayKey();
    const seed = nextMode === 'daily' ? solitaireDailySeed(dayIndex()) : createGenerationSeed();
    seedRef.current = seed;
    setMode(nextMode);
    setDailyDate(today);
    setGame(createSeededSolitaireDeal(seed));
    setSelection(null);
    setSeconds(0);
    setMoves(0);
    setUndoCount(0);
    setUndoStack([]);
    setIsNewBest(false);
    setLegacyMigrated(false);
    startedAt.current = null;
    setAnnouncement(t.instructions);
    setBestTime(getBestForConditions('solitaire', conditionsFor(nextMode, seed, today, 'none'))?.value ?? null);
  }, [conditionsFor, t.instructions]);

  useEffect(() => {
    const today = todayKey();
    const restored = loadSolitaireSaveV2(today);
    if (restored) {
      const restoredSeconds = restored.legacyMigrated ? 0 : restoredSolitaireSeconds(restored);
      seedRef.current = restored.seed;
      moveMadeRef.current = true;
      setMode(restored.mode);
      setDailyDate(restored.dailyDate);
      setGame(restored.state);
      setSeconds(restoredSeconds);
      setMoves(restored.moves);
      setUndoCount(restored.undoCount);
      setLegacyMigrated(restored.legacyMigrated);
      startedAt.current = performance.now() - restoredSeconds * 1000;
      setBestTime(getBestForConditions('solitaire', conditionsFor(restored.mode, restored.seed, restored.dailyDate, restored.undoCount > 0 ? 'undo' : 'none'))?.value ?? null);
    } else {
      const seed = solitaireDailySeed(dayIndex());
      seedRef.current = seed;
      setGame(createSeededSolitaireDeal(seed));
      setBestTime(getBestForConditions('solitaire', conditionsFor('daily', seed, today, 'none'))?.value ?? null);
    }
    setRecord(getRecord('solitaire'));
    setStreak(getDailyStreak(DAILY_GAME_ID, today, previousDayKey(today)));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const won = isSolitaireWon(game);

  useEffect(() => {
    if (!hydrated) return;
    if (won || !moveMadeRef.current) return;
    storeSolitaireSaveV2({
      mode,
      dailyDate,
      seed: seedRef.current,
      state: game,
      elapsedSeconds: seconds,
      moves,
      undoCount,
      legacyMigrated,
      savedAtEpochMs: Date.now(),
    });
  }, [dailyDate, game, hydrated, legacyMigrated, mode, moves, seconds, undoCount, won]);

  useEffect(() => {
    if (won || legacyMigrated) return;
    const id = setInterval(() => {
      if (startedAt.current !== null) setSeconds(Math.max(0, Math.floor((performance.now() - startedAt.current) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [won, legacyMigrated]);

  const commit = useCallback((move: SolitaireMove) => {
    const next = applySolitaireMove(game, move);
    if (!next) {
      setAnnouncement(t.illegal);
      return false;
    }
    if (startedAt.current === null) startedAt.current = performance.now();
    moveMadeRef.current = true;
    setUndoStack((stack) => [...stack.slice(-(UNDO_STACK_LIMIT - 1)), game]);
    setMoves((count) => count + 1);
    setGame(next);
    setSelection(null);
    setAnnouncement(t.moved);
    return true;
  }, [game, t.illegal, t.moved]);

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      const previous = stack.at(-1);
      if (!previous) return stack;
      setGame(previous);
      setSelection(null);
      setUndoCount((count) => {
        const next = count + 1;
        if (count === 0) setBestTime(getBestForConditions('solitaire', conditionsFor(mode, seedRef.current, dailyDate, 'undo'))?.value ?? null);
        return next;
      });
      setMoves((count) => count + 1);
      setAnnouncement(t.undone);
      return stack.slice(0, -1);
    });
  }, [conditionsFor, dailyDate, mode, t.undone]);

  const chooseTableau = (column: number, cardIndex?: number) => {
    const pile = game.tableau[column];
    if (cardIndex === undefined) {
      if (selection) moveToTableau(column);
      return;
    }
    const card = pile[cardIndex];
    if (!card.isFaceUp) {
      if (cardIndex === pile.length - 1) commit({ type: 'flip', column });
      return;
    }
    if (selection && !(selection.type === 'tableau' && selection.column === column && selection.cardIndex === cardIndex)) {
      moveToTableau(column);
      return;
    }
    if (!isValidTableauRun(pile.slice(cardIndex))) {
      setAnnouncement(t.illegal);
      return;
    }
    setSelection({ type: 'tableau', column, cardIndex });
    setAnnouncement(t.selected);
  };

  const moveToTableau = (to: number) => {
    if (!selection) return;
    if (selection.type === 'tableau') commit({ type: 'tableau-to-tableau', from: selection.column, cardIndex: selection.cardIndex, to });
    else if (selection.type === 'waste') commit({ type: 'waste-to-tableau', to });
    else commit({ type: 'foundation-to-tableau', suit: selection.suit, to });
  };

  const chooseFoundation = (suit: SolitaireSuit) => {
    if (selection?.type === 'tableau') {
      const pile = game.tableau[selection.column];
      if (selection.cardIndex !== pile.length - 1 || pile.at(-1)?.suit !== suit) setAnnouncement(t.illegal);
      else commit({ type: 'tableau-to-foundation', from: selection.column });
      return;
    }
    if (selection?.type === 'waste') {
      if (game.waste.at(-1)?.suit !== suit) setAnnouncement(t.illegal);
      else commit({ type: 'waste-to-foundation' });
      return;
    }
    if (game.foundations[suit].length > 0) {
      setSelection({ type: 'foundation', suit });
      setAnnouncement(t.selected);
    }
  };

  useEffect(() => {
    if (won && !wonRef.current) {
      wonRef.current = true;
      clearSolitaireSaveV2();
      setRecord(recordResult('solitaire', 'w'));
      if (mode === 'daily') {
        const today = todayKey();
        setStreak(recordDailyWin(DAILY_GAME_ID, today, previousDayKey(today)));
      }
      if (!legacyMigrated) {
        const finalSeconds = Math.max(1, seconds);
        const previousBest = bestTime;
        const next = recordBestForConditions('solitaire', finalSeconds, 'seconds', conditionsFor(mode, seedRef.current, dailyDate, undoCount > 0 ? 'undo' : 'none')).value;
        setIsNewBest(previousBest === null || finalSeconds < previousBest);
        setBestTime(next);
      }
    }
  }, [won, mode, legacyMigrated, seconds, bestTime, conditionsFor, dailyDate, undoCount]);

  const stockMove: SolitaireMove = game.stock.length > 0 ? { type: 'draw' } : { type: 'recycle' };
  const stockLabel = game.stock.length > 0 ? t.stock : t.recycle;
  const solvedToday = streak?.lastWinDate === todayKey();
  const tableauHeight = Math.max(420, ...game.tableau.map((pile) => (
    128 + pile.slice(0, -1).reduce((sum, card) => sum + (card.isFaceUp ? 36 : 22), 0)
  )));

  return (
    <GameContainer title={t.title} subtitle={t.subtitle} resetLabel={t.reset} onReset={() => initGame(mode)}>
      <div className="relative">
        <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => initGame('daily')} aria-pressed={mode === 'daily'}
            className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === 'daily' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {t.daily}{solvedToday ? ' ✓' : ''}
          </button>
          <button type="button" onClick={() => initGame('free')} aria-pressed={mode === 'free'}
            className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === 'free' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {t.free}
          </button>
          <button type="button" onClick={undo} disabled={undoStack.length === 0 || won}
            className="min-h-11 rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            ↩︎ {t.undo}
          </button>
        </div>

        {mode === 'daily' && streak && streak.played > 0 && (
          <p className="text-[11px] font-bold text-muted-foreground">🔥 {t.streak} {streak.currentStreak} · {t.best} {streak.maxStreak}</p>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-md text-sm text-muted-foreground">{t.desc}</p>
          <div className="flex flex-col items-end gap-1 text-xs font-bold text-muted-foreground">
            <span>{legacyMigrated ? `${t.moves} ${moves}` : `${t.time} ${fmt(seconds)} · ${t.moves} ${moves}`}</span>
            {record && record.w + record.l > 0 && <span>{t.record} {record.w}–{record.l}</span>}
            {bestTime !== null && !legacyMigrated && <span>{t.best} {fmt(bestTime)}{undoCount > 0 ? ` · ${t.assisted}` : ''}</span>}
          </div>
        </div>
        {legacyMigrated && <p className="text-[11px] font-medium text-muted-foreground">{t.untimed}</p>}
        <p className="text-xs text-muted-foreground">{t.instructions}</p>
        <p aria-live="polite" className="min-h-5 text-sm font-semibold text-primary">{announcement}</p>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => commit(stockMove)} disabled={game.stock.length === 0 && game.waste.length === 0} aria-label={`${stockLabel} (${game.stock.length})`} className="relative min-h-24 min-w-16 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40">
              {game.stock.length > 0 ? <PlayingCard suit="spades" value="" isFaceUp={false} className="pointer-events-none motion-reduce:transition-none" /> : <span className="flex h-24 w-16 items-center justify-center rounded-xl border-2 border-dashed text-2xl">↻</span>}
              {game.stock.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-primary px-2 py-1 text-[10px] font-black text-primary-foreground">{game.stock.length}</span>}
            </button>
            <div className="min-h-24 min-w-16">
              {game.waste.length > 0 && (
                <button type="button" onClick={() => { setSelection({ type: 'waste' }); setAnnouncement(t.selected); }} onDoubleClick={() => commit({ type: 'waste-to-foundation' })} aria-label={`${t.waste}: ${game.waste.at(-1)?.value} ${game.waste.at(-1) ? SUIT_ICON[game.waste.at(-1)!.suit] : ''}`} aria-pressed={selection?.type === 'waste'} className={`rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selection?.type === 'waste' ? 'ring-4 ring-primary' : ''}`}>
                  <PlayingCard {...game.waste.at(-1)!} className="pointer-events-none motion-reduce:transition-none" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 sm:gap-2" aria-label={t.foundation}>
            {SOLITAIRE_SUITS.map((suit) => {
              const top = game.foundations[suit].at(-1);
              const active = selection?.type === 'foundation' && selection.suit === suit;
              return (
                <button type="button" key={suit} onClick={() => chooseFoundation(suit)} aria-label={`${t.foundation} ${SUIT_ICON[suit]}${top ? `: ${top.value}` : ''}`} aria-pressed={active} className={`relative flex h-24 w-16 items-center justify-center rounded-xl border-2 border-dashed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-32 sm:w-20 ${active ? 'ring-4 ring-primary' : ''}`}>
                  <span aria-hidden="true" className={`text-3xl opacity-30 ${suit === 'hearts' || suit === 'diamonds' ? 'text-destructive' : ''}`}>{SUIT_ICON[suit]}</span>
                  {top && <PlayingCard {...top} className="pointer-events-none absolute inset-0 motion-reduce:transition-none" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="grid min-w-[472px] grid-cols-7 gap-1 sm:min-w-[632px] sm:gap-3" style={{ minHeight: tableauHeight }} aria-label={t.tableau}>
            {game.tableau.map((pile, column) => (
              <div key={column} className="relative h-full">
                {pile.length === 0 && <button type="button" onClick={() => chooseTableau(column)} aria-label={`${t.empty} ${column + 1}`} className="h-24 w-16 rounded-xl border border-dashed border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-32 sm:w-20" />}
                {pile.map((card, cardIndex) => {
                  const active = selection?.type === 'tableau' && selection.column === column && selection.cardIndex === cardIndex;
                  const offset = pile.slice(0, cardIndex).reduce((sum, prior) => sum + (prior.isFaceUp ? 36 : 22), 0);
                  return (
                    <button type="button" key={card.id} onClick={() => chooseTableau(column, cardIndex)} onDoubleClick={() => cardIndex === pile.length - 1 && card.isFaceUp && commit({ type: 'tableau-to-foundation', from: column })} aria-label={`${t.tableau} ${column + 1}, ${card.isFaceUp ? `${card.value} ${SUIT_ICON[card.suit]}` : ''}`} aria-pressed={active} style={{ top: offset }} className={`absolute left-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? 'ring-4 ring-primary' : ''}`}>
                      <PlayingCard {...card} className="pointer-events-none shadow-md motion-reduce:transition-none" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        </div>

        {won && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-4xl bg-background/90 p-6 text-center backdrop-blur-xl motion-reduce:animate-none" role="status" aria-live="polite">
            <div aria-hidden="true" className="mb-6 text-6xl">🏆</div>
            <h4 className="mb-2 text-3xl font-black text-primary sm:text-4xl">{t.win}</h4>
            <p className="mb-1 text-sm font-bold text-muted-foreground">
              {legacyMigrated ? `${t.moves} ${moves}` : `${t.time} ${fmt(Math.max(1, seconds))} · ${t.moves} ${moves}`}
              {undoCount > 0 ? ` · ${t.undo} ${undoCount}` : ''}
            </p>
            {!legacyMigrated && bestTime !== null && (
              <p className="mb-1 text-xs font-bold text-muted-foreground">{isNewBest ? t.newBest : `${t.best} ${fmt(bestTime)}`} · {t.nextGoal}: {fmt(Math.max(1, bestTime - 1))}{undoCount > 0 ? ` · ${t.assisted}` : ''}</p>
            )}
            {mode === 'daily' && streak && <p className="mb-4 text-xs font-bold text-muted-foreground">🔥 {t.streak} {streak.currentStreak}</p>}
            <button type="button" onClick={() => initGame(mode)} className="min-h-11 rounded-full bg-primary px-10 py-3 font-black text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t.reset}</button>
          </div>
        )}
      </div>
    </GameContainer>
  );
};

export default Solitaire;
