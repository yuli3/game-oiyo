"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TentsIsland3DScene, type CellMark } from './TentsIsland3DScene';
import {
  generateUniqueTents,
  validateTents,
  type Pos,
} from '../../lib/games/tents';

interface Props {
  lang?: string;
}

type Difficulty = 'easy' | 'medium' | 'hard';

const SIZES: Record<Difficulty, { size: number; pairs: number }> = {
  easy: { size: 5, pairs: 3 },
  medium: { size: 6, pairs: 5 },
  hard: { size: 7, pairs: 7 },
};

const I18N: Record<string, {
  title: string;
  subtitle: string;
  easy: string;
  medium: string;
  hard: string;
  time: string;
  tentsRemaining: string;
  newPuzzle: string;
  resetMarks: string;
  wonTitle: string;
  wonDesc: string;
  playAgain: string;
  hintGuide: string;
}> = {
  ko: {
    title: '3D 텐트 퍼즐 아일랜드 (Tents Island 3D)',
    subtitle: '저폴리곤 3D 캠핑 섬 · 나무와 텐트 퍼즐 · Three.js 숲속 아일랜드',
    easy: '초급 (5×5)',
    medium: '중급 (6×6)',
    hard: '고급 (7×7)',
    time: '시간',
    tentsRemaining: '남은 텐트',
    newPuzzle: '새 섬 탐험',
    resetMarks: '배치 초기화',
    wonTitle: '축하합니다! 캠핑장 완성!',
    wonDesc: '모든 나무에 텐트가 1:1로 연결되었으며, 텐트끼리 서로 닿지 않도록 완벽히 배치했습니다.',
    playAgain: '새로운 섬 탐험하기',
    hintGuide: '타일을 탭하여 [빈칸 → 텐트 → 잔디 마커] 순으로 전환하세요. 텐트끼리는 대각선으로도 닿을 수 없습니다.',
  },
  en: {
    title: '3D Tents Island Puzzle',
    subtitle: 'Low-poly 3D Camping Island · Tents & Trees Puzzle · Three.js Forest View',
    easy: 'Easy (5×5)',
    medium: 'Medium (6×6)',
    hard: 'Hard (7×7)',
    time: 'Time',
    tentsRemaining: 'Tents Left',
    newPuzzle: 'New Island',
    resetMarks: 'Reset Grid',
    wonTitle: 'Camp Complete! Well Done!',
    wonDesc: 'Every tree is paired with a tent, and no two tents touch each other.',
    playAgain: 'Explore Next Island',
    hintGuide: 'Tap tiles to cycle: [Empty → Tent → Grass Marker]. Tents cannot touch, even diagonally.',
  },
  ja: {
    title: '3D テントパズル アイランド',
    subtitle: 'ローポリ3Dキャンプ島 · 木とテントパズル · Three.js 森林アイランド',
    easy: '初級 (5×5)',
    medium: '中級 (6×6)',
    hard: '上級 (7×7)',
    time: 'タイム',
    tentsRemaining: '残りテント',
    newPuzzle: '新しい島',
    resetMarks: 'リセット',
    wonTitle: 'おめでとうございます！キャンプ完成！',
    wonDesc: 'すべての木にテントが1対1で配置され、テント同士も接触していません。',
    playAgain: '別の島へ',
    hintGuide: 'タイルをタップして [空 → テント → 草マーカー] を切り替えます。テント同士は斜めでも隣接できません。',
  },
  zh: {
    title: '3D 帐篷拼图海岛 (Tents Island 3D)',
    subtitle: '低多边形3D露营海岛 · 树木与帐篷经典数理逻辑 · Three.js 森林立体景观',
    easy: '初级 (5×5)',
    medium: '中级 (6×6)',
    hard: '高级 (7×7)',
    time: '用时',
    tentsRemaining: '剩余帐篷',
    newPuzzle: '新岛屿',
    resetMarks: '清空标记',
    wonTitle: '恭喜！露营营地搭建完毕！',
    wonDesc: '每棵树都有对应的帐篷，且任意两个帐篷之间互不相邻（包含对角）。',
    playAgain: '探索新海岛',
    hintGuide: '点击地块循环切换：[空地 → 帐篷 → 草地标记]。帐篷之间不能相互触碰（包括对角线）。',
  },
  fr: {
    title: 'Tentes & Arbres 3D — Île de Camping',
    subtitle: 'Île 3D low-poly · Puzzle de tentes et arbres · Three.js',
    easy: 'Facile (5×5)',
    medium: 'Moyen (6×6)',
    hard: 'Difficile (7×7)',
    time: 'Temps',
    tentsRemaining: 'Tentes restantes',
    newPuzzle: 'Nouvelle Île',
    resetMarks: 'Réinitialiser',
    wonTitle: 'Félicitations ! Camping terminé !',
    wonDesc: 'Chaque tente est reliée à un arbre sans qu aucune tente ne se touche.',
    playAgain: 'Nouvelle Île',
    hintGuide: 'Touchez pour faire défiler [Vide → Tente → Herbe]. Les tentes ne peuvent pas se toucher.',
  },
  es: {
    title: 'Tiendas & Árboles 3D — Isla de Acampada',
    subtitle: 'Isla de acampada 3D low-poly · Rompecabezas Three.js',
    easy: 'Fácil (5×5)',
    medium: 'Medio (6×6)',
    hard: 'Difícil (7×7)',
    time: 'Tiempo',
    tentsRemaining: 'Tiendas restantes',
    newPuzzle: 'Nueva Isla',
    resetMarks: 'Reiniciar',
    wonTitle: '¡Enhorabuena! ¡Campamento completado!',
    wonDesc: 'Cada tienda está emparejada con un árbol y no hay tiendas en contacto.',
    playAgain: 'Explorar otra isla',
    hintGuide: 'Toca las baldosas para cambiar [Vacío → Tienda → Césped]. Las tiendas no se pueden tocar.',
  },
};

export function TentsIsland3D({ lang = 'ko' }: Props) {
  const t = I18N[lang] || I18N.ko;
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [puzzleData, setPuzzleData] = useState(() => {
    const { size, pairs } = SIZES.easy;
    return generateUniqueTents(size, pairs);
  });

  const puzzle = puzzleData.puzzle;
  const [marks, setMarks] = useState<CellMark[][]>(() =>
    Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill('empty'))
  );

  const [seconds, setSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(true);

  // Extract tent positions from marks
  const placedTents: Pos[] = useMemo(() => {
    const list: Pos[] = [];
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (marks[r][c] === 'tent') list.push([r, c]);
      }
    }
    return list;
  }, [marks, puzzle.size]);

  // Validate complete solution
  const validation = useMemo(() => {
    return validateTents(placedTents, puzzle);
  }, [placedTents, puzzle]);

  const isComplete = validation.complete;

  useEffect(() => {
    if (!timerActive || isComplete) return;
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, isComplete]);

  const handleCellClick = (r: number, c: number) => {
    if (isComplete) return;
    setMarks((prev) => {
      const next = prev.map((row) => [...row]);
      const cur = next[r][c];
      if (cur === 'empty') next[r][c] = 'tent';
      else if (cur === 'tent') next[r][c] = 'grass';
      else next[r][c] = 'empty';
      return next;
    });
  };

  const handleNewPuzzle = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    const { size, pairs } = SIZES[diff];
    const generated = generateUniqueTents(size, pairs);
    setPuzzleData(generated);
    setMarks(Array.from({ length: size }, () => Array(size).fill('empty')));
    setSeconds(0);
    setTimerActive(true);
  }, []);

  const handleResetMarks = () => {
    setMarks(Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill('empty')));
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const remainingTents = puzzle.trees.length - placedTents.length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {/* Top HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-foreground">{t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Difficulty Selector */}
        <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleNewPuzzle(d)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                difficulty === d
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t[d]}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
            {t.time}: <span className="font-black text-foreground">{formatTime(seconds)}</span>
          </div>
          <div className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
            {t.tentsRemaining}:{' '}
            <span
              className={`font-black ${
                remainingTents === 0 ? 'text-chart-1' : 'text-chart-5'
              }`}
            >
              {remainingTents}
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetMarks}
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-secondary"
          >
            {t.resetMarks}
          </button>
          <button
            type="button"
            onClick={() => handleNewPuzzle(difficulty)}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground shadow transition hover:opacity-90 active:scale-95"
          >
            {t.newPuzzle}
          </button>
        </div>
      </div>

      {/* 3D Scene Viewport */}
      <TentsIsland3DScene
        puzzle={puzzle}
        marks={marks}
        onCellClick={handleCellClick}
        isComplete={isComplete}
      />

      <p className="text-center text-xs text-muted-foreground">{t.hintGuide}</p>

      {/* Victory Modal */}
      {isComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-chart-1/20 text-3xl">
              🏕️
            </div>
            <h3 className="text-2xl font-black text-foreground">{t.wonTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.wonDesc}</p>
            <div className="rounded-2xl bg-secondary p-3 text-xs font-bold text-secondary-foreground">
              {t.time}: {formatTime(seconds)} · {t[difficulty]}
            </div>
            <button
              type="button"
              onClick={() => handleNewPuzzle(difficulty)}
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
