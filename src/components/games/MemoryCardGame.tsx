import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Share2, Volume2, VolumeX } from 'lucide-react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';
import { useArcadePortal } from '@/lib/games/arcade-portal';
import { usePrefersReducedMotion } from '@/lib/games/reduced-motion';
import { celebrate } from '@/lib/games/celebration';
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from '@/lib/games/share-card';
import { createMemoryGame, flipMemoryCard, MEMORY_GRID_CONFIG, memoryPairCount, resolveMemoryPair, type MemoryGridSize, type MemoryState } from '@/lib/games/memory-card-game';
import { clearMemoryCardSave, loadMemoryCardSave, storeMemoryCardSave } from '@/lib/games/memory-card-game-save';
import { MEMORY_SPRITES, memoryFaceName, memoryFaceSrc } from '@/lib/games/sprites';

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

const MemoryCardGame: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const COPY = {
    ko: {
      title: '카드 짝 맞추기',
      subtitle: '기억력 훈련 메모리 게임',
      easy:   '쉬움 — 4×4',
      medium: '보통 — 6×4',
      hard:   '어려움 — 6×6',
      start:  '게임 시작',
      reset:  '다시 시작',
      flips:  '뒤집기',
      matched: '맞춘 쌍',
      time:   '시간',
      won:    '모두 맞췄어요!',
      chooseLevel: '난이도를 선택하세요',
      pairs: (n: number, total: number) => `${n} / ${total} 쌍`,
      flipsUnit: '번', cardLabel: '카드',
    },
    en: {
      title: 'Memory Cards',
      subtitle: 'Memory Card Matching Game',
      easy:   'Easy — 4×4',
      medium: 'Medium — 6×4',
      hard:   'Hard — 6×6',
      start:  'Start Game',
      reset:  'Play Again',
      flips:  'Flips',
      matched: 'Matched',
      time:   'Time',
      won:    'All matched!',
      chooseLevel: 'Choose difficulty',
      pairs: (n: number, total: number) => `${n} / ${total} pairs`,
      flipsUnit: 'flips', cardLabel: 'Card',
    },
    ja: {
      title: 'カード神経衰弱',
      subtitle: '記憶力トレーニングゲーム',
      easy:   'かんたん — 4×4',
      medium: 'ふつう — 6×4',
      hard:   'むずかしい — 6×6',
      start:  'ゲーム開始',
      reset:  'もう一度',
      flips:  'めくり回数',
      matched: '成立ペア',
      time:   '時間',
      won:    '全部そろいました！',
      chooseLevel: '難易度を選んでください',
      pairs: (n: number, total: number) => `${n} / ${total} ペア`,
      flipsUnit: '回', cardLabel: 'カード',
    },
    zh: {
      title: '记忆翻牌',
      subtitle: '记忆力训练游戏',
      easy:   '简单 — 4×4',
      medium: '普通 — 6×4',
      hard:   '困难 — 6×6',
      start:  '开始游戏',
      reset:  '再玩一次',
      flips:  '翻牌次数',
      matched: '已配对',
      time:   '时间',
      won:    '全部配对成功！',
      chooseLevel: '请选择难度',
      pairs: (n: number, total: number) => `${n} / ${total} 对`,
      flipsUnit: '次', cardLabel: '卡牌',
    },
    fr: {
      title: 'Jeu de mémoire',
      subtitle: 'Jeu de paires pour la mémoire',
      easy:   'Facile — 4×4',
      medium: 'Moyen — 6×4',
      hard:   'Difficile — 6×6',
      start:  'Commencer',
      reset:  'Rejouer',
      flips:  'Retournements',
      matched: 'Paires',
      time:   'Temps',
      won:    'Tout est apparié !',
      chooseLevel: 'Choisissez la difficulté',
      pairs: (n: number, total: number) => `${n} / ${total} paires`,
      flipsUnit: 'retournements', cardLabel: 'Carte',
    },
    es: {
      title: 'Juego de memoria',
      subtitle: 'Juego de parejas de memoria',
      easy:   'Fácil — 4×4',
      medium: 'Normal — 6×4',
      hard:   'Difícil — 6×6',
      start:  'Empezar',
      reset:  'Jugar de nuevo',
      flips:  'Volteos',
      matched: 'Parejas',
      time:   'Tiempo',
      won:    '¡Todas emparejadas!',
      chooseLevel: 'Elige la dificultad',
      pairs: (n: number, total: number) => `${n} / ${total} parejas`,
      flipsUnit: 'volteos', cardLabel: 'Carta',
    },
  };
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || 'ko' });

  const [state, setState] = useState<MemoryState | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const [paused, setPaused] = useState(false);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const [best, setBest] = useState<{ timeMs: number; flips: number } | null>(null);
  const elapsedBase = useRef(0);
  const audio = useRef<AudioContext | null>(null);

  const [muted, setMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('memory_card_sound_muted') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('memory_card_sound_muted', String(muted));
    } catch {
      // SSR-safe fallback
    }
  }, [muted]);

  const tone = (frequency: number, duration = 0.08) => {
    if (muted || typeof window === 'undefined') return;
    const context = audio.current ?? new AudioContext(); audio.current = context;
    const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0.035, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration);
  };

  const startGame = (gridSize: MemoryGridSize, seed?: number) => {
    const nextSeed = seed ?? (crypto.getRandomValues?.(new Uint32Array(1))[0] ?? Date.now()) >>> 0;
    clearMemoryCardSave(); elapsedBase.current = 0; setRestored(false); setPaused(false);
    try { setBest(JSON.parse(localStorage.getItem(`oiyo:memory-card-game-best:${gridSize}`) ?? 'null')); } catch { setBest(null); }
    setState(createMemoryGame(nextSeed, gridSize)); setElapsedMs(0); setStartTime(Date.now());
  };

  useEffect(() => {
    const saved = loadMemoryCardSave();
    if (saved) { elapsedBase.current = saved.elapsedMs; setElapsedMs(saved.elapsedMs); setState(saved.state); setStartTime(null); setPaused(true); setRestored(true); try { setBest(JSON.parse(localStorage.getItem(`oiyo:memory-card-game-best:${saved.state.gridSize}`) ?? 'null')); } catch { /* ignore */ } }
    return () => { audio.current?.close(); };
  }, []);

  // Timer tick
  useEffect(() => {
    if (state?.status !== 'playing' || paused || !startTime) return;
    const id = setInterval(() => setElapsedMs(elapsedBase.current + Date.now() - startTime), 250);
    return () => clearInterval(id);
  }, [state?.status, paused, startTime]);

  // Auto check match after 2 flips
  useEffect(() => {
    if (state?.flipped.length === 2) {
      const ids = state.flipped; const matched = state.cards[ids[0]].symbolId === state.cards[ids[1]].symbolId;
      const id = setTimeout(() => { tone(matched ? 660 : 180, matched ? 0.14 : 0.1); setState((current) => current ? resolveMemoryPair(current) : current); }, prefersReducedMotion ? 180 : 650);
      return () => clearTimeout(id);
    }
  }, [state?.flipped, prefersReducedMotion]);

  useEffect(() => {
    if (!state) return;
    if (state.status === 'won') {
      clearMemoryCardSave();
      tone(880, 0.24);
      if (containerRef.current) celebrate(containerRef.current, { preset: "cards" });
      const key = `oiyo:memory-card-game-best:${state.gridSize}`;
      const result = { timeMs: elapsedMs, flips: state.flips };
      try {
        const previous = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (!previous || result.flips < previous.flips || result.flips === previous.flips && result.timeMs < previous.timeMs) {
          localStorage.setItem(key, JSON.stringify(result));
          setBest(result);
        }
      } catch { /* best effort */ }
      return;
    }
    if (state.flipped.length < 2) storeMemoryCardSave(state, elapsedMs);
  }, [state]);

  useEffect(() => {
    const hidden = () => { if (document.hidden && state?.status === 'playing') { const current = startTime ? elapsedBase.current + Date.now() - startTime : elapsedMs; elapsedBase.current = current; setElapsedMs(current); setStartTime(null); setPaused(true); if (state.flipped.length < 2) storeMemoryCardSave(state, current); } };
    document.addEventListener('visibilitychange', hidden); return () => document.removeEventListener('visibilitychange', hidden);
  }, [state, elapsedMs, startTime]);

  const togglePause = () => { if (!state || state.status !== 'playing') return; if (paused) { setStartTime(Date.now()); setPaused(false); } else { elapsedBase.current = elapsedMs; setStartTime(null); setPaused(true); storeMemoryCardSave(state, elapsedMs); } };

  const handleShareCard = async () => {
    if (!state) return;
    const canvas = createShareCardCanvas({
      title: "Memory Card Game",
      subtitle: `Memory Match Complete (${state.gridSize})`,
      score: `${formatTime(elapsedMs)}`,
      slug: "memory-card",
      customStats: [
        { label: "Grid Size", value: `${state.gridSize}` },
        { label: "Total Flips", value: `${state.flips} Flips` },
        { label: "Pairs Matched", value: `${totalPairs} Pairs` },
        ...(best ? [{ label: "Best", value: `${best.flips} Flips` }] : []),
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `memory-card-${state.gridSize}.png`);
    }
  };

  const shareResult = async () => { if (!state) return; const message = `OIYO Memory ${state.gridSize} · ${state.flips} flips · ${formatTime(elapsedMs)}`; try { await navigator.clipboard.writeText(message); } catch { /* best effort */ } };

  const handleFlip = (cardId: number) => { tone(360); setRestored(false); setState((current) => current ? flipMemoryCard(current, cardId) : current); };
  const handleKey = (event: React.KeyboardEvent<HTMLButtonElement>, cardId: number) => {
    if (!state || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const count = state.cards.length; let next = cardId;
    if (event.key === 'ArrowLeft') next = Math.max(0, cardId - 1); if (event.key === 'ArrowRight') next = Math.min(count - 1, cardId + 1);
    if (event.key === 'ArrowUp') next = Math.max(0, cardId - cols); if (event.key === 'ArrowDown') next = Math.min(count - 1, cardId + cols);
    if (event.key === 'Home') next = 0; if (event.key === 'End') next = count - 1;
    document.querySelector<HTMLButtonElement>(`[data-memory-card="${next}"]`)?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        togglePortal();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMuted((v) => !v);
      } else if ((e.key === 'p' || e.key === 'P') && state?.status === 'playing') {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePortal, togglePause, state?.status]);

  const { cols } = state ? MEMORY_GRID_CONFIG[state.gridSize] : MEMORY_GRID_CONFIG['4x4'];
  const totalPairs = state ? memoryPairCount(state) : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full transition-all duration-300 ${
        isImmersive ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-y-auto p-4' : ''
      }`}
    >
      <div className="w-full max-w-xl mx-auto mb-2 flex items-center justify-end gap-2 px-1">
        <button
          type="button"
          onClick={() => setMuted((v) => !v)}
          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={muted ? portalLabels.unmute : portalLabels.mute}
          title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`}
        >
          {muted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-primary" />}
          <span className="sr-only">{muted ? portalLabels.unmute : portalLabels.mute}</span>
        </button>
        <button
          type="button"
          onClick={togglePortal}
          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
          title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
        >
          {isImmersive ? <Minimize2 className="h-4 w-4 text-primary" /> : <Maximize2 className="h-4 w-4" />}
          <span className="sr-only">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
        </button>
      </div>

      <GameContainer
        title={t.title}
        subtitle={t.subtitle}
        onReset={state ? () => startGame(state.gridSize) : undefined}
      >
        {/* Difficulty selection */}
        {!state && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">{t.chooseLevel}</p>
            <div className="flex flex-col gap-3">
              {(['4x4', '6x4', '6x6'] as MemoryGridSize[]).map((size, i) => (
                <button
                  key={size}
                  onClick={() => startGame(size)}
                  aria-label={[t.easy, t.medium, t.hard][i]}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-border bg-muted hover:bg-accent hover:border-primary font-bold text-sm transition-all text-left"
                >
                  {[t.easy, t.medium, t.hard][i]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Game board */}
        {state && (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-muted-foreground" role="status" aria-live="polite">{restored ? (locale === 'ko' ? '이전 게임을 복원했습니다' : 'Game restored') : `${state.gridSize} · ${state.cards.length} cards`}</span>
              <div className="flex gap-2">
                <button type="button" onClick={togglePause} className="min-h-11 rounded-xl border border-border px-3 text-sm font-bold hover:bg-muted" aria-pressed={paused}>
                  {paused ? '▶' : 'Ⅱ'} <span className="sr-only">Pause</span>
                </button>
              </div>
            </div>
          {/* Stats bar */}
          <div className="flex items-center justify-between mb-4 text-sm font-bold text-muted-foreground">
            <span>{t.flips}: <span className="text-foreground">{state.flips}</span></span>
            <span aria-live="polite">{t.matched}: <span className="text-primary">{t.pairs(state.matchedPairs, totalPairs)}</span></span>
            <span>{t.time}: <span className="text-foreground">{formatTime(elapsedMs)}</span></span>
          </div>

          {/* Win message */}
          {state.status === 'won' && (
            <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center" role="status" aria-live="assertive">
              <p className="text-lg font-black text-emerald-700">{t.won}</p>
              <p className="text-sm text-emerald-600">
                {formatTime(elapsedMs)} — {state.flips} {t.flipsUnit}
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-700">{locale === 'ko' ? `쌍당 ${(state.flips / totalPairs).toFixed(1)}회 · 다음 목표 ${Math.max(totalPairs * 2, state.flips - 2)}회` : `${(state.flips / totalPairs).toFixed(1)} flips/pair · Next ${Math.max(totalPairs * 2, state.flips - 2)}`}</p>
              {best && <p className="mt-1 text-xs text-emerald-700">PB · {best.flips} · {formatTime(best.timeMs)}</p>}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleShareCard()}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/20 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/30 active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{shareCardCopied ? "복사됨!" : "공유 카드"}</span>
                </button>
                <button
                  onClick={() => startGame(state.gridSize)}
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:bg-primary/90 transition-all"
                >
                  {t.reset}
                </button>
              </div>
            </div>
          )}

          {/* Card grid */}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, touchAction: 'manipulation' }}
            aria-label={t.title}
          >
            {state.cards.map((card) => (
              <button
                key={card.id}
                onPointerUp={() => handleFlip(card.id)}
                onClick={(event) => { if (event.detail === 0) handleFlip(card.id); }}
                onKeyDown={(event) => handleKey(event, card.id)}
                data-memory-card={card.id}
                disabled={paused || card.isMatched || card.isFlipped || state.flipped.length === 2 || state.status === 'won'}
                aria-label={card.isFlipped || card.isMatched ? memoryFaceName(card.symbolId) : `${t.cardLabel} ${card.id + 1}`}
                aria-pressed={card.isFlipped || card.isMatched}
                className={[
                  'min-h-11 min-w-11 aspect-square rounded-xl border-2 [perspective:700px]',
                  card.isMatched
                    ? 'border-emerald-300 bg-emerald-50 scale-95'
                    : card.isFlipped
                    ? 'border-primary bg-transparent'
                    : 'border-primary/30 bg-transparent hover:border-primary cursor-pointer active:scale-95',
                ].join(' ')}
              >
                <span className={`oiyo-memory-inner ${card.isFlipped || card.isMatched ? 'is-flipped' : ''}`}>
                  <span className="oiyo-memory-face rounded-xl bg-primary/10">
                    <img src={MEMORY_SPRITES.back} alt="" draggable={false} className="h-[70%] w-[70%] object-contain pointer-events-none" />
                  </span>
                  <span className="oiyo-memory-face is-front rounded-xl bg-card">
                    <img src={memoryFaceSrc(card.symbolId)} alt="" draggable={false} className="h-[78%] w-[78%] object-contain pointer-events-none" />
                  </span>
                </span>
                {card.isMatched && <span className="sr-only"> matched</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </GameContainer>
    </div>
  );
};

export default MemoryCardGame;
