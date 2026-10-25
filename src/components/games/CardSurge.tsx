import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  initGame,
  toggleCardSelection,
  discardCards,
  playCards,
  openShop,
  buyJoker,
  sellJoker,
  rerollShop,
  advanceToNextBlind,
  evaluatePlayedHand,
  type CardSurgeState,
  type SurgeCard,
  type SurgeJoker,
  type ScoreBreakdown,
  type ScoringStep,
} from "../../lib/games/card-surge";
import {
  createCameraShake,
  addTrauma,
  updateCameraShake,
  type ScreenTraumaState,
} from "../../lib/games/screen-shake";
import { Button } from "../ui/button";

function playWebTone(freq: number, type: OscillatorType = "sine", duration: number = 0.1, gain: number = 0.15) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, duration * 1000 + 100);
  } catch {
    // Ignore audio context errors
  }
}

function playWebChord(freqs: number[], type: OscillatorType = "triangle", duration: number = 0.3, gain: number = 0.1) {
  for (const f of freqs) {
    playWebTone(f, type, duration, gain);
  }
}

interface CardSurgeProps {
  locale?: string;
}

const SUIT_ICONS: Record<string, string> = {
  spades: "♠",
  hearts: "♥",
  clubs: "♣",
  diamonds: "♦",
};

const SUIT_COLORS: Record<string, string> = {
  spades: "text-foreground",
  clubs: "text-primary",
  hearts: "text-destructive",
  diamonds: "text-chart-3",
};

const RANK_LABELS: Record<number, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

export default function CardSurge({ locale = "ko" }: CardSurgeProps) {
  const [state, setState] = useState<CardSurgeState>(() => initGame());
  const [isScoringAnim, setIsScoringAnim] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<ScoringStep | null>(null);
  const [sortMode, setSortMode] = useState<"rank" | "suit">("rank");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const shakeEngineRef = useRef<ScreenTraumaState>(createCameraShake());
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });

  const triggerShake = useCallback((amount: number) => {
    shakeEngineRef.current = addTrauma(shakeEngineRef.current, amount);
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const res = updateCameraShake(shakeEngineRef.current, dt);
      shakeEngineRef.current = res.state;
      setShakeOffset({
        x: Math.round(res.offset.offsetX * 10) / 10,
        y: Math.round(res.offset.offsetY * 10) / 10,
      });
      if (res.state.trauma > 0.01) {
        requestAnimationFrame(tick);
      } else {
        setShakeOffset({ x: 0, y: 0 });
      }
    };
    requestAnimationFrame(tick);
  }, []);

  // Audio helper
  const playCardClickSound = useCallback(() => {
    playWebTone(440, "sine", 0.05, 0.1);
  }, []);

  const playScoreStepSound = useCallback((stepIdx: number) => {
    const baseFreq = 300 + stepIdx * 45;
    playWebTone(baseFreq, "triangle", 0.08, 0.15);
  }, []);

  const playBigScoreSound = useCallback(() => {
    playWebChord([523.25, 659.25, 783.99, 1046.5], "triangle", 0.4, 0.25);
  }, []);

  // Sort hand cards
  const sortedHand = useMemo(() => {
    return [...state.hand].sort((a, b) => {
      if (sortMode === "rank") {
        if (b.rank !== a.rank) return b.rank - a.rank;
        return a.suit.localeCompare(b.suit);
      } else {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        return b.rank - a.rank;
      }
    });
  }, [state.hand, sortMode]);

  // Selected cards objects
  const selectedCards = useMemo(() => {
    return state.hand.filter((c) => state.selectedCardIds.includes(c.id));
  }, [state.hand, state.selectedCardIds]);

  // Preview poker hand for selected cards
  const handPreview = useMemo(() => {
    if (selectedCards.length === 0) return null;
    const { handType } = evaluatePlayedHand(selectedCards);
    const levelInfo = state.handLevels[handType];
    return {
      handType,
      name: levelInfo.name[locale] ?? levelInfo.name.ko,
      chips: levelInfo.chips,
      mult: levelInfo.mult,
    };
  }, [selectedCards, state.handLevels, locale]);

  // Handle card click
  const handleCardClick = (cardId: string) => {
    if (isScoringAnim || state.phase !== "play") return;
    playCardClickSound();
    setState((prev) => toggleCardSelection(prev, cardId));
  };

  // Discard action
  const handleDiscard = () => {
    if (isScoringAnim || state.phase !== "play" || state.selectedCardIds.length === 0) return;
    playWebTone(220, "sine", 0.1, 0.12);
    setState((prev) => discardCards(prev));
  };

  // Play hand action with step-by-step scoring animation
  const handlePlayHand = () => {
    if (isScoringAnim || state.phase !== "play" || state.selectedCardIds.length === 0) return;

    try {
      const { nextState, breakdown } = playCards(state);
      setIsScoringAnim(true);

      // Animate steps
      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < breakdown.steps.length) {
          const step = breakdown.steps[stepIdx];
          setActiveStep(step);
          playScoreStepSound(stepIdx);
          stepIdx++;
        } else {
          clearInterval(interval);
          playBigScoreSound();
          triggerShake(breakdown.totalScore > 500 ? 0.6 : 0.3);
          setTimeout(() => {
            setIsScoringAnim(false);
            setActiveStep(null);
            setState(nextState);
          }, 600);
        }
      }, 250);
    } catch {
      // Ignore
    }
  };

  // Open shop
  const handleOpenShop = () => {
    setState((prev) => openShop(prev));
  };

  // Buy Joker
  const handleBuyJoker = (jokerId: string) => {
    playWebTone(600, "sine", 0.1, 0.15);
    setState((prev) => buyJoker(prev, jokerId));
  };

  // Sell Joker
  const handleSellJoker = (idx: number) => {
    playWebTone(350, "sine", 0.1, 0.12);
    setState((prev) => sellJoker(prev, idx));
  };

  // Reroll Shop
  const handleReroll = () => {
    playWebTone(400, "triangle", 0.1, 0.15);
    setState((prev) => rerollShop(prev));
  };

  // Next Blind
  const handleNextBlind = () => {
    playWebTone(550, "sine", 0.15, 0.2);
    setState((prev) => advanceToNextBlind(prev));
  };

  // Restart
  const handleRestart = () => {
    setState(initGame());
  };

  // Share result
  const handleShareResult = async () => {
    const text = `🃏 OIYO 카드 서지 (Card Surge)\n안테 ${state.ante} 도달! 획득 점수: ${state.currentRoundScore.toLocaleString()}점\n보유 조커: ${state.jokers.map((j) => j.name[locale] ?? j.name.ko).join(", ") || "없음"}\nhttps://game.oiyo.net/${locale}/card-surge/`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div
      style={
        {
          "--shake-x": `${shakeOffset.x}px`,
          "--shake-y": `${shakeOffset.y}px`,
        } as React.CSSProperties
      }
      className="relative mx-auto flex w-full max-w-4xl translate-x-(--shake-x) translate-y-(--shake-y) flex-col items-center justify-between rounded-3xl border border-border bg-card p-4 shadow-xl sm:p-6"
    >
      {/* Top HUD: Ante, Blind info, Targets, Resources */}
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Ante & Blind */}
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-muted/40 p-3">
          <span className="text-xs font-bold text-muted-foreground">
            {locale === "ko" ? "안테 (Ante)" : "Ante"}
          </span>
          <span className="text-xl font-black text-foreground">
            {state.ante} <span className="text-xs font-normal text-muted-foreground">/ 8</span>
          </span>
          <span className="mt-1 text-xs font-bold uppercase tracking-wider text-primary">
            {state.blindType === "small"
              ? locale === "ko" ? "스몰 블라인드" : "Small Blind"
              : state.blindType === "big"
                ? locale === "ko" ? "빅 블라인드" : "Big Blind"
                : `${locale === "ko" ? "보스" : "Boss"}: ${state.bossBlind?.name[locale] ?? state.bossBlind?.name.ko}`}
          </span>
        </div>

        {/* Score & Progress */}
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-muted/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">
              {locale === "ko" ? "목표 점수" : "Target"}
            </span>
            <span className="text-xs font-bold text-foreground">
              {state.targetScore.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-lg font-black text-primary">
            {state.currentRoundScore.toLocaleString()}
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 w-(--pct)"
              style={{
                "--pct": `${Math.min(100, Math.round((state.currentRoundScore / state.targetScore) * 100))}%`,
              } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Hands & Discards */}
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-muted/40 p-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">{locale === "ko" ? "핸드" : "Hands"}</span>
            <span className="text-foreground">{state.handsRemaining}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">{locale === "ko" ? "버리기" : "Discards"}</span>
            <span className="text-foreground">{state.discardsRemaining}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">{locale === "ko" ? "남은 덱" : "Deck"}</span>
            <span className="text-foreground">{state.deck.length}장</span>
          </div>
        </div>

        {/* Money & Store */}
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-muted/40 p-3">
          <span className="text-xs font-bold text-muted-foreground">
            {locale === "ko" ? "보유 골드" : "Money"}
          </span>
          <span className="text-2xl font-black text-warning">
            ${state.money}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">
            {locale === "ko" ? "조커 슬롯" : "Jokers"} {state.jokers.length}/5
          </span>
        </div>
      </div>

      {/* Jokers Bar */}
      <div className="mt-4 flex w-full flex-col">
        <div className="mb-1 flex items-center justify-between px-1 text-xs font-bold text-muted-foreground">
          <span>{locale === "ko" ? "장착된 조커 (최대 5장)" : "Active Jokers (Max 5)"}</span>
          {state.phase === "shop" && (
            <span className="text-warning">{locale === "ko" ? "클릭하여 판매 가능" : "Click to sell"}</span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, idx) => {
            const joker = state.jokers[idx];
            return (
              <div
                key={idx}
                className={`relative flex min-h-20 flex-col justify-between rounded-xl border p-2 text-left transition-all ${
                  joker
                    ? "border-primary/40 bg-card shadow-xs"
                    : "border-dashed border-border bg-muted/20"
                }`}
              >
                {joker ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black line-clamp-1 text-foreground">
                        {joker.name[locale] ?? joker.name.ko}
                      </span>
                      <span className="text-xs">🃏</span>
                    </div>
                    <p className="mt-1 text-xs font-medium leading-tight text-muted-foreground line-clamp-2">
                      {joker.description[locale] ?? joker.description.ko}
                    </p>
                    {state.phase === "shop" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSellJoker(idx);
                        }}
                        className="mt-1 self-end rounded-sm bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive hover:bg-destructive/20"
                      >
                        ${Math.max(1, Math.floor(joker.cost / 2))} {locale === "ko" ? "판매" : "Sell"}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="m-auto text-xs font-semibold text-muted-foreground/40">
                    {idx + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Play Area */}
      <div className="mt-6 flex w-full flex-col items-center justify-center">
        {/* Hand Preview Banner */}
        <div className="mb-4 flex min-h-12 w-full max-w-lg items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2">
          {activeStep ? (
            <div className="flex w-full items-center justify-between font-black text-primary">
              <span className="text-sm">{activeStep.sourceName}</span>
              <div className="flex items-center gap-2 text-base">
                <span className="text-foreground">{activeStep.totalChips}</span>
                <span className="text-primary">×</span>
                <span className="text-destructive">{activeStep.totalMult}</span>
                <span className="text-muted-foreground">=</span>
                <span className="text-lg text-primary">
                  {(activeStep.totalChips * activeStep.totalMult).toLocaleString()}
                </span>
              </div>
            </div>
          ) : handPreview ? (
            <>
              <span className="text-sm font-black text-foreground">{handPreview.name}</span>
              <div className="flex items-center gap-2 font-black">
                <span className="rounded-md bg-card px-2 py-0.5 text-xs text-foreground shadow-xs">
                  {handPreview.chips} {locale === "ko" ? "칩" : "Chips"}
                </span>
                <span className="text-primary">×</span>
                <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                  {handPreview.mult} {locale === "ko" ? "배율" : "Mult"}
                </span>
              </div>
            </>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {locale === "ko" ? "카드를 최대 5장 선택하여 핸드를 만드세요." : "Select up to 5 cards to play a poker hand."}
            </span>
          )}
        </div>

        {/* Hand Cards Grid */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {sortedHand.map((card) => {
            const isSelected = state.selectedCardIds.includes(card.id);
            const isDebuffed = Boolean(
              card.debuffed ||
                (state.bossBlind?.suitDebuff && card.suit === state.bossBlind.suitDebuff)
            );

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCardClick(card.id)}
                disabled={isScoringAnim || state.phase !== "play"}
                className={`relative flex h-28 w-18 flex-col justify-between rounded-xl border-2 bg-card p-2 shadow-sm transition-all sm:h-32 sm:w-20 ${
                  isSelected
                    ? "-translate-y-4 border-primary shadow-md ring-2 ring-primary/40"
                    : "border-border hover:-translate-y-1 hover:border-primary/50"
                } ${isDebuffed ? "opacity-60" : ""}`}
              >
                {/* Top Rank & Suit */}
                <div className={`flex items-center gap-1 font-black ${SUIT_COLORS[card.suit]}`}>
                  <span className="text-sm sm:text-base">{RANK_LABELS[card.rank]}</span>
                  <span className="text-xs sm:text-sm">{SUIT_ICONS[card.suit]}</span>
                </div>

                {/* Center Large Suit Icon */}
                <div className={`m-auto text-3xl font-black ${SUIT_COLORS[card.suit]}`}>
                  {SUIT_ICONS[card.suit]}
                </div>

                {/* Bottom Rank (Inverted) */}
                <div className={`self-end text-xs font-bold ${SUIT_COLORS[card.suit]}`}>
                  {RANK_LABELS[card.rank]}
                </div>

                {/* Debuff Banner */}
                {isDebuffed && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 font-black text-destructive text-xs uppercase">
                    {locale === "ko" ? "무효" : "Debuff"}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Controls: Play, Discard, Sort */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={handlePlayHand}
            disabled={
              isScoringAnim ||
              state.phase !== "play" ||
              state.selectedCardIds.length === 0 ||
              state.handsRemaining <= 0
            }
            className="min-w-36"
          >
            {locale === "ko" ? "핸드 내기" : "Play Hand"} ({selectedCards.length}/5)
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleDiscard}
            disabled={
              isScoringAnim ||
              state.phase !== "play" ||
              state.selectedCardIds.length === 0 ||
              state.discardsRemaining <= 0
            }
          >
            {locale === "ko" ? "버리기" : "Discard"} ({state.discardsRemaining})
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSortMode((prev) => (prev === "rank" ? "suit" : "rank"))}
            disabled={isScoringAnim || state.phase !== "play"}
          >
            {sortMode === "rank"
              ? locale === "ko" ? "숫자순 정렬" : "Sort by Rank"
              : locale === "ko" ? "무늬순 정렬" : "Sort by Suit"}
          </Button>
        </div>
      </div>

      {/* Round Cleared Modal / Overlay */}
      {state.phase === "round-cleared" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-background/95 p-6 backdrop-blur-xs">
          <span className="text-4xl">🎉</span>
          <h2 className="mt-2 text-2xl font-black text-foreground">
            {locale === "ko" ? "블라인드 격파 성공!" : "Blind Defeated!"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {locale === "ko" ? "목표 점수를 달성했습니다. 상점으로 이동하여 덱을 강화하세요." : "Target score reached. Enter shop to power up your deck."}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-black text-primary">
              +{3 + Math.max(0, state.handsRemaining)} 골드 획득
            </span>
          </div>
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={handleOpenShop}
            className="mt-6"
          >
            {locale === "ko" ? "상점 입장 →" : "Enter Shop →"}
          </Button>
        </div>
      )}

      {/* Shop View Modal / Overlay */}
      {state.phase === "shop" && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between overflow-y-auto rounded-3xl bg-background/98 p-6 backdrop-blur-sm">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-xl font-black text-foreground">
                  🛒 {locale === "ko" ? "아케이드 상점" : "Arcade Shop"}
                </h2>
                <p className="text-xs font-semibold text-muted-foreground">
                  {locale === "ko" ? "새로운 조커를 영입하여 폭발적인 배율을 완성하세요." : "Acquire new jokers to build exponential multipliers."}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-muted-foreground">{locale === "ko" ? "보유 자금" : "Funds"}</span>
                <div className="text-2xl font-black text-warning">${state.money}</div>
              </div>
            </div>

            {/* Shop Offers Grid */}
            <div className="mt-6">
              <span className="text-xs font-bold text-muted-foreground">
                {locale === "ko" ? "구매 가능한 조커" : "Available Jokers"}
              </span>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {state.shopOffers.map((joker) => {
                  const canAfford = state.money >= joker.cost;
                  const isFull = state.jokers.length >= 5;

                  return (
                    <div
                      key={joker.id}
                      className="flex flex-col justify-between rounded-2xl border border-primary/30 bg-card p-4 shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-black text-foreground">
                            {joker.name[locale] ?? joker.name.ko}
                          </span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            {joker.rarity}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-medium leading-relaxed text-muted-foreground">
                          {joker.description[locale] ?? joker.description.ko}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant={canAfford && !isFull ? "default" : "secondary"}
                        size="sm"
                        disabled={!canAfford || isFull}
                        onClick={() => handleBuyJoker(joker.id)}
                        className="mt-4"
                      >
                        {isFull
                          ? locale === "ko" ? "슬롯 가득 참" : "Slots Full"
                          : `${locale === "ko" ? "구매" : "Buy"} ($${joker.cost})`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Shop Footer Controls */}
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={state.money < state.shopRerollCost}
              onClick={handleReroll}
            >
              🎲 {locale === "ko" ? "상점 새로고침" : "Reroll"} (${state.shopRerollCost})
            </Button>

            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={handleNextBlind}
            >
              {locale === "ko" ? "다음 블라인드로 이동 →" : "Next Blind →"}
            </Button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {state.phase === "game-over" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-background/95 p-6 backdrop-blur-xs">
          <span className="text-4xl">💀</span>
          <h2 className="mt-2 text-2xl font-black text-destructive">
            {locale === "ko" ? "게임 오버" : "Game Over"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {locale === "ko" ? `안테 ${state.ante}에서 도전을 마쳤습니다.` : `Fell at Ante ${state.ante}.`}
          </p>
          <div className="mt-4 flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-muted-foreground">{locale === "ko" ? "달성 점수" : "Final Round Score"}</span>
            <span className="text-3xl font-black text-foreground">
              {state.currentRoundScore.toLocaleString()}점
            </span>
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="button" variant="default" size="lg" onClick={handleRestart}>
              {locale === "ko" ? "다시 도전" : "Try Again"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={handleShareResult}>
              {copySuccess ? (locale === "ko" ? "복사 완료!" : "Copied!") : (locale === "ko" ? "결과 공유" : "Share Result")}
            </Button>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {state.phase === "victory" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-background/95 p-6 backdrop-blur-xs">
          <span className="text-5xl">👑</span>
          <h2 className="mt-2 text-3xl font-black text-primary">
            {locale === "ko" ? "서지 마스터 등극!" : "Surge Master Victory!"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {locale === "ko" ? "안테 8 보스 블라인드를 모두 격파하고 정상에 올랐습니다!" : "You conquered all 8 Ante Boss Blinds and reached the pinnacle!"}
          </p>
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="default" size="lg" onClick={handleRestart}>
              {locale === "ko" ? "새로운 여정 시작" : "New Run"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={handleShareResult}>
              {copySuccess ? (locale === "ko" ? "복사 완료!" : "Copied!") : (locale === "ko" ? "우승 기록 복사" : "Share Victory")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
