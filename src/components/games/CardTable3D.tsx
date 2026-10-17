"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { CardTable3DScene } from './CardTable3DScene';
import {
  createInitialSolitaireState,
  drawFromStock,
  moveWasteToTableau,
  moveWasteToFoundation,
  moveTableauToFoundation,
  moveTableauToTableau,
  autoMoveToFoundation,
  type SolitaireState,
  type Card,
} from '../../lib/games/card-table';

interface Props {
  lang?: string;
}

type LangCopy = {
  title: string;
  subtitle: string;
  moves: string;
  score: string;
  time: string;
  newGame: string;
  autoSolve: string;
  undo: string;
  wonTitle: string;
  wonDesc: string;
  playAgain: string;
  rulesHint: string;
};

const I18N: Record<string, LangCopy> = {
  ko: {
    title: '3D 클래식 솔리테어 카드 테이블',
    subtitle: '클래식 클론다이크 룰 · Three.js 3D 입체 우드 펠트 포커 테이블',
    moves: '이동',
    score: '점수',
    time: '시간',
    newGame: '새 게임',
    autoSolve: '자동 회수',
    undo: '되돌리기',
    wonTitle: '축하합니다! 솔리테어 완성!',
    wonDesc: '모든 카드를 4개의 파운데이션(에이스~킹)으로 완벽하게 이동시켰습니다.',
    playAgain: '한 판 더 하기',
    rulesHint: '카드를 탭하여 선택 후 대상 열이나 파운데이션을 탭하세요. 스톡을 누르면 새 카드를 뽑습니다.',
  },
  en: {
    title: '3D Classic Solitaire Card Table',
    subtitle: 'Classic Klondike Rules · Three.js 3D Wood & Felt Poker Table',
    moves: 'Moves',
    score: 'Score',
    time: 'Time',
    newGame: 'New Game',
    autoSolve: 'Auto Collect',
    undo: 'Undo',
    wonTitle: 'Victory! Solitaire Complete!',
    wonDesc: 'All cards successfully assembled into the 4 foundations.',
    playAgain: 'Play Again',
    rulesHint: 'Tap a card to select, then tap target column or foundation. Tap stock to draw.',
  },
  ja: {
    title: '3D クラシック ソリティア カードテーブル',
    subtitle: 'クラシック クロンダイク ルール · Three.js 3D ウッド フェルト テーブル',
    moves: '手',
    score: 'スコア',
    time: '時間',
    newGame: 'ニューゲーム',
    autoSolve: '自動回収',
    undo: '元に戻す',
    wonTitle: 'おめでとうございます！クリア！',
    wonDesc: 'すべてのカードを組札へ移動させました。',
    playAgain: 'もう一度プレイ',
    rulesHint: 'カードをタップして選択し、移動先をタップします。山札から引くこともできます。',
  },
  zh: {
    title: '3D 经典纸牌桌 (Solitaire)',
    subtitle: '经典克朗代克规则 · Three.js 3D 木质毛毡牌桌',
    moves: '步数',
    score: '得分',
    time: '用时',
    newGame: '新游戏',
    autoSolve: '自动收牌',
    undo: '撤销',
    wonTitle: '恭喜！牌局通关！',
    wonDesc: '所有卡牌已成功归位至4个目标栏。',
    playAgain: '再玩一局',
    rulesHint: '点击卡牌选中，然后点击目标列或收牌栏。点击牌堆翻开新牌。',
  },
  fr: {
    title: 'Table de Solitaire Classique 3D',
    subtitle: 'Règles Klondike · Table de poker 3D Three.js en bois et feutrine',
    moves: 'Coups',
    score: 'Score',
    time: 'Temps',
    newGame: 'Nouvelle Partie',
    autoSolve: 'Auto-collecte',
    undo: 'Annuler',
    wonTitle: 'Victoire ! Solitaire Terminé !',
    wonDesc: 'Toutes les cartes sont assemblées sur les 4 fondations.',
    playAgain: 'Rejouer',
    rulesHint: 'Touchez une carte pour la sélectionner, puis touchez la cible. Piochez dans le talon.',
  },
  es: {
    title: 'Mesa de Solitario Clásico 3D',
    subtitle: 'Reglas Klondike · Mesa de póquer 3D Three.js de madera y fieltro',
    moves: 'Movimientos',
    score: 'Puntos',
    time: 'Tiempo',
    newGame: 'Nueva Partida',
    autoSolve: 'Auto Recoger',
    undo: 'Deshacer',
    wonTitle: '¡Victoria! ¡Solitario Completado!',
    wonDesc: 'Todas las cartas se han colocado en las 4 fundaciones.',
    playAgain: 'Jugar de Nuevo',
    rulesHint: 'Toca una carta para seleccionarla, luego toca la columna destino.',
  },
};

export function CardTable3D({ lang = 'ko' }: Props) {
  const t = I18N[lang] || I18N.ko;
  const [state, setState] = useState<SolitaireState>(createInitialSolitaireState);
  const [selectedCard, setSelectedCard] = useState<{
    card: Card;
    source: 'waste' | 'tableau';
    colIndex?: number;
    cardIndex?: number;
  } | null>(null);

  const [seconds, setSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(true);

  useEffect(() => {
    if (!timerActive || state.isWon) return;
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, state.isWon]);

  const recordHistory = useCallback((nextState: SolitaireState) => {
    return {
      ...nextState,
      history: [
        ...state.history,
        {
          stock: state.stock,
          waste: state.waste,
          foundations: state.foundations,
          tableau: state.tableau,
          score: state.score,
        },
      ],
    };
  }, [state]);

  const handleStockClick = () => {
    setSelectedCard(null);
    const next = drawFromStock(state);
    setState(recordHistory(next));
  };

  const handleWasteClick = () => {
    if (state.waste.length === 0) return;
    const top = state.waste[state.waste.length - 1];
    if (selectedCard?.source === 'waste') {
      setSelectedCard(null);
    } else {
      setSelectedCard({ card: top, source: 'waste' });
    }
  };

  const handleTableauCardClick = (colIndex: number, cardIndex: number) => {
    const col = state.tableau[colIndex];
    const clickedCard = col[cardIndex];

    if (!clickedCard.faceUp) return;

    if (!selectedCard) {
      // Select clicked card
      setSelectedCard({
        card: clickedCard,
        source: 'tableau',
        colIndex,
        cardIndex,
      });
      return;
    }

    // Attempt move
    if (selectedCard.source === 'waste') {
      const next = moveWasteToTableau(state, colIndex);
      if (next) {
        setState(recordHistory(next));
        setSelectedCard(null);
      } else {
        setSelectedCard({
          card: clickedCard,
          source: 'tableau',
          colIndex,
          cardIndex,
        });
      }
    } else if (selectedCard.source === 'tableau') {
      if (selectedCard.colIndex === colIndex) {
        // Deselect or select different depth
        if (selectedCard.cardIndex === cardIndex) {
          setSelectedCard(null);
        } else {
          setSelectedCard({
            card: clickedCard,
            source: 'tableau',
            colIndex,
            cardIndex,
          });
        }
      } else {
        const next = moveTableauToTableau(
          state,
          selectedCard.colIndex!,
          selectedCard.cardIndex!,
          colIndex
        );
        if (next) {
          setState(recordHistory(next));
          setSelectedCard(null);
        } else {
          setSelectedCard({
            card: clickedCard,
            source: 'tableau',
            colIndex,
            cardIndex,
          });
        }
      }
    }
  };

  const handleEmptyTableauClick = (colIndex: number) => {
    if (!selectedCard) return;

    if (selectedCard.source === 'waste') {
      const next = moveWasteToTableau(state, colIndex);
      if (next) {
        setState(recordHistory(next));
        setSelectedCard(null);
      }
    } else if (selectedCard.source === 'tableau') {
      const next = moveTableauToTableau(
        state,
        selectedCard.colIndex!,
        selectedCard.cardIndex!,
        colIndex
      );
      if (next) {
        setState(recordHistory(next));
        setSelectedCard(null);
      }
    }
  };

  const handleFoundationClick = (foundationIndex: number) => {
    if (!selectedCard) return;

    if (selectedCard.source === 'waste') {
      const next = moveWasteToFoundation(state, foundationIndex);
      if (next) {
        setState(recordHistory(next));
        setSelectedCard(null);
      }
    } else if (selectedCard.source === 'tableau') {
      // Only the top card of tableau can move to foundation
      const col = state.tableau[selectedCard.colIndex!];
      if (selectedCard.cardIndex === col.length - 1) {
        const next = moveTableauToFoundation(state, selectedCard.colIndex!, foundationIndex);
        if (next) {
          setState(recordHistory(next));
          setSelectedCard(null);
        }
      }
    }
  };

  const handleAutoSolve = () => {
    let current = state;
    let moved = autoMoveToFoundation(current);
    let iterations = 0;
    while (moved && iterations < 52) {
      current = moved;
      moved = autoMoveToFoundation(current);
      iterations++;
    }
    if (iterations > 0) {
      setState(recordHistory(current));
      setSelectedCard(null);
    }
  };

  const handleUndo = () => {
    if (state.history.length === 0) return;
    const last = state.history[state.history.length - 1];
    setState({
      stock: last.stock,
      waste: last.waste,
      foundations: last.foundations,
      tableau: last.tableau,
      score: last.score,
      moves: state.moves + 1,
      isWon: false,
      history: state.history.slice(0, -1),
    });
    setSelectedCard(null);
  };

  const handleReset = () => {
    setState(createInitialSolitaireState());
    setSelectedCard(null);
    setSeconds(0);
    setTimerActive(true);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-foreground">{t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
            {t.moves}: <span className="font-black text-foreground">{state.moves}</span>
          </div>
          <div className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
            {t.score}: <span className="font-black text-chart-1">{state.score}</span>
          </div>
          <div className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
            {t.time}: <span className="font-black text-foreground">{formatTime(seconds)}</span>
          </div>

          <button
            type="button"
            onClick={handleAutoSolve}
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-secondary"
          >
            {t.autoSolve}
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={state.history.length === 0}
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-secondary disabled:opacity-40"
          >
            {t.undo}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground shadow transition hover:opacity-90 active:scale-95"
          >
            {t.newGame}
          </button>
        </div>
      </div>

      {/* 3D Scene Viewport */}
      <CardTable3DScene
        state={state}
        selectedCardId={selectedCard?.card.id ?? null}
        onStockClick={handleStockClick}
        onWasteClick={handleWasteClick}
        onTableauCardClick={handleTableauCardClick}
        onFoundationClick={handleFoundationClick}
        onEmptyTableauClick={handleEmptyTableauClick}
      />

      <p className="text-center text-xs text-muted-foreground">{t.rulesHint}</p>

      {/* Victory Modal */}
      {state.isWon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-chart-1/20 text-3xl">
              🏆
            </div>
            <h3 className="text-2xl font-black text-foreground">{t.wonTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.wonDesc}</p>
            <div className="rounded-2xl bg-secondary p-3 text-xs font-bold text-secondary-foreground">
              {t.score}: {state.score} · {t.moves}: {state.moves} · {t.time}: {formatTime(seconds)}
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-2xl bg-primary py-3 text-sm font-black text-primary-foreground shadow transition hover:opacity-90 active:scale-95"
            >
              {t.playAgain}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
