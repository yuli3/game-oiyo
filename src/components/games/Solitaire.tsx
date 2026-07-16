import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer, PlayingCard } from '../ui/game/GamePrimitives';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';
import {
  SOLITAIRE_SUITS,
  applySolitaireMove,
  dealSolitaire,
  isSolitaireWon,
  isValidTableauRun,
  type SolitaireMove,
  type SolitaireState,
  type SolitaireSuit,
} from '../../lib/games/solitaire';

type Selection =
  | { type: 'tableau'; column: number; cardIndex: number }
  | { type: 'waste' }
  | { type: 'foundation'; suit: SolitaireSuit };

const COPY = {
  ko: { title: '솔리테어 (Solitaire)', subtitle: '클론다이크 · 드로우 1', desc: '카드를 교대색 내림차순으로 옮기고, 무늬별로 A부터 K까지 완성하세요.', reset: '새 게임', win: '네 개의 무늬를 모두 완성했습니다!', record: '전적', stock: '스톡에서 한 장 뽑기', recycle: '폐기 더미를 스톡으로 되돌리기', waste: '폐기 더미', foundation: '파운데이션', tableau: '테이블 열', selected: '선택됨', illegal: '그곳에는 놓을 수 없습니다.', moved: '카드를 옮겼습니다.', instructions: '카드나 연속 묶음을 선택한 뒤 목적지 열 또는 파운데이션을 누르세요. 빈 열에는 K만 놓을 수 있습니다.', empty: '빈 열' },
  en: { title: 'Solitaire', subtitle: 'Klondike · Draw 1', desc: 'Build down in alternating colors, then complete each suit from Ace to King.', reset: 'New game', win: 'All four suits are complete!', record: 'Record', stock: 'Draw one card from stock', recycle: 'Recycle waste into stock', waste: 'Waste pile', foundation: 'Foundation', tableau: 'Tableau column', selected: 'Selected', illegal: 'That move is not legal.', moved: 'Card moved.', instructions: 'Select a card or face-up run, then choose a destination column or foundation. Only a King can fill an empty column.', empty: 'Empty column' },
  ja: { title: 'ソリティア', subtitle: 'クロンダイク・1枚めくり', desc: '赤黒交互の降順で移動し、スートごとにAからKまで完成させます。', reset: '新しいゲーム', win: '4つのスートが完成しました！', record: '戦績', stock: '山札から1枚引く', recycle: '捨て札を山札に戻す', waste: '捨て札', foundation: '組札', tableau: '場札の列', selected: '選択中', illegal: 'そこには置けません。', moved: 'カードを移動しました。', instructions: 'カードまたは表向きの並びを選び、移動先の列か組札を押します。空の列にはKだけ置けます。', empty: '空の列' },
  zh: { title: '纸牌接龙', subtitle: '克朗代克·翻一张', desc: '按红黑交替降序移动，再将每种花色从A排到K。', reset: '新游戏', win: '四种花色全部完成！', record: '战绩', stock: '从牌堆抽一张', recycle: '将废牌堆放回牌堆', waste: '废牌堆', foundation: '基础牌堆', tableau: '桌面列', selected: '已选择', illegal: '不能放到那里。', moved: '已移动纸牌。', instructions: '选择一张牌或正面连续牌组，再选择目标列或基础牌堆。空列只能放K。', empty: '空列' },
  fr: { title: 'Solitaire', subtitle: 'Klondike · Tirage 1', desc: 'Descendez en alternant les couleurs, puis complétez chaque couleur de l’as au roi.', reset: 'Nouvelle partie', win: 'Les quatre couleurs sont complètes !', record: 'Bilan', stock: 'Piocher une carte', recycle: 'Remettre la défausse dans la pioche', waste: 'Défausse', foundation: 'Fondation', tableau: 'Colonne', selected: 'Sélectionné', illegal: 'Ce déplacement est interdit.', moved: 'Carte déplacée.', instructions: 'Sélectionnez une carte ou une suite visible, puis une colonne ou une fondation. Seul un roi peut occuper une colonne vide.', empty: 'Colonne vide' },
  es: { title: 'Solitario', subtitle: 'Klondike · Robar 1', desc: 'Baja alternando colores y completa cada palo del as al rey.', reset: 'Nueva partida', win: '¡Los cuatro palos están completos!', record: 'Historial', stock: 'Robar una carta', recycle: 'Devolver el descarte al mazo', waste: 'Descarte', foundation: 'Base', tableau: 'Columna', selected: 'Seleccionada', illegal: 'Ese movimiento no es válido.', moved: 'Carta movida.', instructions: 'Selecciona una carta o secuencia visible y luego una columna o base. Solo un rey puede ocupar una columna vacía.', empty: 'Columna vacía' },
} as const;

const SUIT_ICON: Record<SolitaireSuit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

const Solitaire: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const [game, setGame] = useState<SolitaireState>(() => dealSolitaire());
  const [selection, setSelection] = useState<Selection | null>(null);
  const [announcement, setAnnouncement] = useState<string>(t.instructions);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const moveMadeRef = useRef(false);
  const wonRef = useRef(false);

  useEffect(() => { setRecord(getRecord('solitaire')); }, []);
  useEffect(() => { setAnnouncement(t.instructions); }, [t.instructions]);

  const initGame = useCallback(() => {
    if (moveMadeRef.current && !wonRef.current) setRecord(recordResult('solitaire', 'l'));
    moveMadeRef.current = false;
    wonRef.current = false;
    setGame(dealSolitaire());
    setSelection(null);
    setAnnouncement(t.instructions);
  }, [t.instructions]);

  const commit = useCallback((move: SolitaireMove) => {
    const next = applySolitaireMove(game, move);
    if (!next) {
      setAnnouncement(t.illegal);
      return false;
    }
    moveMadeRef.current = true;
    setGame(next);
    setSelection(null);
    setAnnouncement(t.moved);
    return true;
  }, [game, t.illegal, t.moved]);

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

  const won = isSolitaireWon(game);
  useEffect(() => {
    if (won && !wonRef.current) {
      wonRef.current = true;
      setRecord(recordResult('solitaire', 'w'));
    }
  }, [won]);

  const stockMove: SolitaireMove = game.stock.length > 0 ? { type: 'draw' } : { type: 'recycle' };
  const stockLabel = game.stock.length > 0 ? t.stock : t.recycle;
  const tableauHeight = Math.max(420, ...game.tableau.map((pile) => (
    128 + pile.slice(0, -1).reduce((sum, card) => sum + (card.isFaceUp ? 36 : 22), 0)
  )));

  return (
    <GameContainer title={t.title} subtitle={t.subtitle} resetLabel={t.reset} onReset={initGame}>
      <div className="relative">
        <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-md text-sm text-muted-foreground">{t.desc}</p>
          {record && record.w + record.l > 0 && <p className="text-xs font-bold text-muted-foreground">{t.record} {record.w}–{record.l}</p>}
        </div>
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
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-4xl bg-background/90 p-6 text-center backdrop-blur-xl motion-reduce:animate-none">
            <div aria-hidden="true" className="mb-6 text-6xl">🏆</div>
            <h4 className="mb-4 text-3xl font-black text-primary sm:text-4xl">{t.win}</h4>
            <button type="button" onClick={initGame} className="min-h-11 rounded-full bg-primary px-10 py-3 font-black text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t.reset}</button>
          </div>
        )}
      </div>
    </GameContainer>
  );
};

export default Solitaire;
